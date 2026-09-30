import { useSyncExternalStore } from "react";

/** Réglage global du son partagé par tous les lecteurs vidéo. */
const KEY = "gabomazone:video-muted";
type State = { muted: boolean; blocked: boolean };
let state: State = { muted: false, blocked: false };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { state = { ...state, muted: window.localStorage.getItem(KEY) === "1" }; } catch { /* stockage indisponible */ }
  const unlock = () => {
    if (!state.blocked) return;
    set({ blocked: false });
    applyToVideos();
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchstart", unlock, true);
  window.addEventListener("keydown", unlock, true);
  const stopAll = () => document.querySelectorAll<HTMLVideoElement>("video[data-app-video]").forEach((v) => v.pause());
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAll(); });
  window.addEventListener("pagehide", stopAll);
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function applyToVideos() {
  const m = effectiveMuted();
  document.querySelectorAll<HTMLVideoElement>("video[data-app-video]").forEach((v) => { v.muted = m; });
}

export function effectiveMuted() { load(); return state.muted || state.blocked; }

export function setSoundMuted(muted: boolean) {
  load();
  try { window.localStorage.setItem(KEY, muted ? "1" : "0"); } catch { /* ignore */ }
  set({ muted, blocked: false });
  applyToVideos();
}

export function toggleSound() {
  load();
  setSoundMuted(state.blocked ? false : !state.muted);
}

/** Lance la vidéo avec le son selon le réglage ; repli en muet si le navigateur bloque. */
export function playWithSound(el: HTMLVideoElement) {
  load();
  el.muted = effectiveMuted();
  return el.play().catch((error: unknown) => {
    if ((error as { name?: string })?.name !== "NotAllowedError" || el.muted) return;
    el.muted = true;
    set({ blocked: true });
    return el.play().catch(() => undefined);
  });
}

/** Une seule vidéo à la fois dans toute l'app. */
let current: HTMLVideoElement | null = null;
export function claimPlayback(el: HTMLVideoElement) {
  if (current && current !== el) current.pause();
  current = el;
}
export function releasePlayback(el: HTMLVideoElement | null) { if (current === el) current = null; }

function subscribe(l: () => void) { load(); listeners.add(l); return () => { listeners.delete(l); }; }
const server: State = { muted: false, blocked: false };
export function useSound() {
  const s = useSyncExternalStore(subscribe, () => state, () => server);
  return { muted: s.muted || s.blocked, blocked: s.blocked, toggle: toggleSound };
}
