import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/** Gestionnaire global : une seule vidéo en lecture automatique à la fois. */
let currentVideo: HTMLVideoElement | null = null;

function claimPlayback(el: HTMLVideoElement) {
  if (currentVideo && currentVideo !== el) currentVideo.pause();
  currentVideo = el;
}

export function VideoPlayer({
  src,
  className,
  autoPlayOnVisible = true,
  onOpen,
  startMuted = true,
}: {
  src: string;
  className?: string | undefined;
  autoPlayOnVisible?: boolean;
  onOpen?: () => void;
  startMuted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(startMuted);
  const userMuteChoice = useRef<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Autoplay / pause selon la visibilité
  useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlayOnVisible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          claimPlayback(el);
          // Son activé automatiquement ; repli en muet si le navigateur le bloque.
          const wantMuted = userMuteChoice.current ?? false;
          el.muted = wantMuted;
          setMuted(wantMuted);
          el.play().catch(() => {
            el.muted = true;
            setMuted(true);
            el.play().catch(() => undefined);
          });
        } else if (!el.paused) {
          el.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlayOnVisible, src]);

  useEffect(() => {
    return () => {
      if (currentVideo === ref.current) currentVideo = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      claimPlayback(el);
      el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, []);

  function toggleMute() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    userMuteChoice.current = el.muted;
    setMuted(el.muted);
  }

  async function fullscreen() {
    const el = ref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else el.webkitEnterFullscreen?.();
    } catch {
      /* plein écran indisponible */
    }
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const el = ref.current;
    if (!el || !duration) return;
    el.currentTime = (Number(event.target.value) / 100) * duration;
  }

  return (
    <div className={cn("relative w-full bg-black", className)}>
      <video
        ref={ref}
        src={src}
        muted={startMuted}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onClick={() => (onOpen ? onOpen() : toggle())}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Mettre en pause" : "Lire la vidéo"}
          className="rounded-full p-2 text-white"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={seek}
          aria-label="Progression de la vidéo"
          className="h-1 flex-1 cursor-pointer accent-primary"
        />
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Activer le son" : "Couper le son"}
          className="rounded-full p-2 text-white"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <button
          type="button"
          onClick={fullscreen}
          aria-label="Plein écran"
          className="rounded-full p-2 text-white"
        >
          <Maximize2 className="size-5" />
        </button>
      </div>
    </div>
  );
}