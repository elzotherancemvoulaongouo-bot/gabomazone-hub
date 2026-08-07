import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function Media({
  path,
  type,
  className,
  alt,
  fallbackText,
}: {
  path: string | null;
  type: string | null;
  className?: string | undefined;
  alt: string;
  fallbackText?: string | null;
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
      <video
        src={url}
        className={className}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={className} />;
}