import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  startMuted = true,
}: {
  src: string;
  className?: string | undefined;
  autoPlayOnVisible?: boolean;
  startMuted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(startMuted);
  const userMuteChoice = useRef<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);

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
          // La lecture automatique commence toujours en muet.
          const wantMuted = userMuteChoice.current ?? true;
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
    <div
      className={cn("relative w-full overflow-hidden bg-foreground", className)}
      style={{
         aspectRatio: ratio ? `${Math.max(4 / 5, Math.min(16 / 9, ratio))}` : "16 / 9",
      }}
    >
      <video
        ref={ref}
        src={src}
        muted={startMuted}
        loop
        playsInline
        preload="metadata"
         className="absolute inset-0 h-full w-full object-contain"
         onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration || 0);
          if (el.videoWidth && el.videoHeight) {
            setRatio(el.videoWidth / el.videoHeight);
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
      />

       <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-foreground/75 px-2 pb-2 pt-3 text-background">
          <Button variant="ghost" size="icon"
          type="button"
          onClick={toggle}
          aria-label={playing ? "Mettre en pause" : "Lire la vidéo"}
           className="shrink-0 text-background hover:bg-background/20 hover:text-background"
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
         </Button>
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
         <Button variant="ghost" size="icon"
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Activer le son" : "Couper le son"}
           className="shrink-0 text-background hover:bg-background/20 hover:text-background"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
         </Button>
         <Button variant="ghost" size="icon"
          type="button"
          onClick={fullscreen}
          aria-label="Plein écran"
           className="shrink-0 text-background hover:bg-background/20 hover:text-background"
        >
          <Maximize2 className="size-5" />
         </Button>
      </div>
    </div>
  );
}