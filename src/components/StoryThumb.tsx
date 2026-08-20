import { useSignedUrl } from "@/lib/media";
import { UserAvatar } from "@/components/Avatar";
import { STORY_BACKGROUNDS, type Story } from "@/lib/stories";
import { cn } from "@/lib/utils";

/** Miniature d'un statut : photo, image de la vidéo, aperçu du texte, sinon avatar. */
export function StoryThumb({
  story,
  fallbackAvatar,
  fallbackName,
  className,
}: {
  story?: Story | undefined;
  fallbackAvatar?: string | null | undefined;
  fallbackName?: string | null | undefined;
  className?: string | undefined;
}) {
  const { data: url } = useSignedUrl(story?.media_path);

  if (story && !story.media_path && story.caption) {
    const bg = STORY_BACKGROUNDS.find((b) => b.id === story.background) ?? STORY_BACKGROUNDS[0]!;
    return (
      <span
        className={cn(
          "inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full p-1.5 text-center",
          bg.className,
          className,
        )}
      >
        <span className="line-clamp-3 text-[9px] font-semibold leading-tight text-white">
          {story.caption}
        </span>
      </span>
    );
  }

  if (story?.media_path && url) {
    return (
      <span className={cn("inline-flex size-16 shrink-0 overflow-hidden rounded-full", className)}>
        {story.media_type === "video" ? (
          <video
            src={`${url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="size-full object-cover"
          />
        ) : (
          <img src={url} alt="" className="size-full object-cover" />
        )}
      </span>
    );
  }

  return <UserAvatar avatarPath={fallbackAvatar} name={fallbackName} className={cn("size-16", className)} />;
}
