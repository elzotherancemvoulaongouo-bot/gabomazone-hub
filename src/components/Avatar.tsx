import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function UserAvatar({
  avatarPath,
  name,
  className,
}: {
  avatarPath?: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
}) {
  const { data: url } = useSignedUrl(avatarPath);
  const initials = (name ?? "?").slice(0, 2).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-muted-foreground ring-2 ring-primary/40",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name ?? "avatar"} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}