import { useEffect, useRef, useState } from "react";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/VideoPlayer";

export function Media({
  path,
  type,
  className,
  alt,
  fallbackText,
  onOpenVideo,
  autoPlay = true,
  eager = false,
}: {
  path: string | null;
  type: string | null;
  className?: string | undefined;
  alt: string;
  fallbackText?: string | null;
  onOpenVideo?: () => void;
  autoPlay?: boolean;
  /** Charge le média immédiatement (visionneuse plein écran) au lieu d'attendre la visibilité. */
  eager?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager);

  useEffect(() => {
    if (eager || near) return;
    const el = holder.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setNear(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, near]);

  const { data: url, isPending } = useSignedUrl(near ? path : null);

  if (!path) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted p-3 text-center text-xs leading-snug",
          className,
        )}
      >
        <span className="line-clamp-5">{fallbackText ?? alt}</span>
      </div>
    );
  }

  if (!near || isPending || !url) {
    return <div ref={holder} className={cn("animate-pulse bg-muted", className)} />;
  }

  if (type === "video") {
    return (
      <VideoPlayer
        src={url}
        className={className}
        autoPlayOnVisible={autoPlay}
        {...(onOpenVideo ? { onOpen: onOpenVideo } : {})}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
