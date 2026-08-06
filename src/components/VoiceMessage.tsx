import { useSignedUrl } from "@/lib/media";
import { formatDuration } from "@/lib/messages";

export function VoiceMessage({ path, duration }: { path: string; duration: number | null }) {
  const { data: url } = useSignedUrl(path);

  return (
    <div className="flex items-center gap-2">
      {url ? (
        <audio src={url} controls preload="metadata" className="h-9 max-w-[220px]" />
      ) : (
        <div className="h-9 w-40 animate-pulse rounded-full bg-muted" />
      )}
      {duration ? <span className="text-[11px] opacity-70">{formatDuration(duration)}</span> : null}
    </div>
  );
}
