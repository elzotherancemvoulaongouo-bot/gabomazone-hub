import { useSignedUrl } from "@/lib/media";

export function CommunityCover({ path }: { path: string | null }) {
  const { data: url } = useSignedUrl(path);
  return (
    <div className="h-32 overflow-hidden rounded-2xl border border-border/70 brand-surface sm:h-44">
      {url ? (
        <img src={url} alt="Photo de couverture" className="size-full object-cover" />
      ) : (
        <div className="size-full bg-gradient-to-br from-primary/25 via-secondary to-background" />
      )}
    </div>
  );
}
