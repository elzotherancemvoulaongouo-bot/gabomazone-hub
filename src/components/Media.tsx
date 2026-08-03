import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function Media({
  path,
  type,
  className,
  alt,
}: {
  path: string;
  type: string;
  className?: string;
  alt: string;
}) {
  const { data: url, isPending } = useSignedUrl(path);

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