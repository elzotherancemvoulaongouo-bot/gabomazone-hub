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
}: {
  path: string | null;
  type: string | null;
  className?: string | undefined;
  alt: string;
  fallbackText?: string | null;
  onOpenVideo?: () => void;
  autoPlay?: boolean;
}) {
  const { data: url, isPending } = useSignedUrl(path);

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

  if (isPending || !url) {
    return <div className={cn("animate-pulse bg-muted", className)} />;
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

  return <img src={url} alt={alt} loading="lazy" className={className} />;
}