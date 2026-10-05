import { toast } from "sonner";

/** Types de contenus partageables : publication, vidéo, page, groupe, profil. */
export type ShareKind = "p" | "watch" | "pg" | "g" | "u";

/**
 * Lien public de partage. Il ouvre un aperçu lisible sans compte (titre, image,
 * bouton de connexion) ; une personne connectée est redirigée vers le contenu.
 */
export function buildShareUrl(kind: ShareKind, id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${kind}/${encodeURIComponent(id)}`;
}

export type SharePayload = { title?: string; text?: string; url: string };

type Listener = (payload: SharePayload | null) => void;
const listeners = new Set<Listener>();

export function subscribeShareSheet(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function openShareSheet(payload: SharePayload | null) {
  listeners.forEach((fn) => fn(payload));
}

/**
 * À appeler uniquement depuis un clic. Utilise le partage natif du téléphone,
 * sinon ouvre la feuille de secours (Copier le lien, WhatsApp, Messenger…).
 * L'annulation par l'utilisateur est silencieuse.
 */
export async function shareContent(payload: SharePayload) {
  const data = { title: payload.title || "Gabomazone", text: payload.text || "", url: payload.url };
  void recordPostShare(payload.url);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data);
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // annulé
    }
  }
  openShareSheet(data);
}

export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const area = document.createElement("textarea");
    area.value = url;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast.success("Lien copié");
}

const AFTER_LOGIN_KEY = "gabomazone:after-login";

export function rememberAfterLogin(path: string) {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, path);
  } catch {
    /* ignoré */
  }
}

/** Renvoie (et efface) la destination mémorisée avant la connexion. */
export function consumeAfterLogin(): string | null {
  try {
    const value = sessionStorage.getItem(AFTER_LOGIN_KEY);
    sessionStorage.removeItem(AFTER_LOGIN_KEY);
    return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
  } catch {
    return null;
  }
}

/** Compte un partage de publication (signal pour l'algorithme du fil). Silencieux en cas d'échec. */
async function recordPostShare(url: string) {
  try {
    const match = url.match(/\/s\/(?:p|watch)\/([0-9a-f-]{36})/i);
    if (!match) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from("post_shares").insert({ post_id: match[1]!, user_id: userId });
  } catch {
    /* ignoré */
  }
}
