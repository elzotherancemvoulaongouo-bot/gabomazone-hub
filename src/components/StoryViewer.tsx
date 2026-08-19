import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { useSignedUrl, timeAgo } from "@/lib/media";
import { deleteStory, markStorySeen, type StoryGroup } from "@/lib/stories";
import { useQueryClient } from "@tanstack/react-query";

const IMAGE_DURATION = 5000;

export function StoryViewer({
  groups,
  startGroup,
  currentUserId,
  onClose,
}: {
  groups: StoryGroup[];
  startGroup: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [groupIndex, setGroupIndex] = useState(startGroup);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const { data: mediaUrl } = useSignedUrl(story?.media_path);

  const next = useCallback(() => {
    setProgress(0);
    setStoryIndex((index) => {
      const current = groups[groupIndex];
      if (current && index + 1 < current.stories.length) return index + 1;
      setGroupIndex((g) => {
        if (g + 1 < groups.length) return g + 1;
        onClose();
        return g;
      });
      return 0;
    });
  }, [groupIndex, groups, onClose]);

  const previous = useCallback(() => {
    setProgress(0);
    setStoryIndex((index) => {
      if (index > 0) return index - 1;
      let target = 0;
      setGroupIndex((g) => {
        if (g > 0) {
          target = (groups[g - 1]?.stories.length ?? 1) - 1;
          return g - 1;
        }
        return g;
      });
      return target;
    });
  }, [groups]);

  // Marquer comme vue
  useEffect(() => {
    if (!story) return;
    void markStorySeen(story.id, currentUserId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["stories"] }),
    );
  }, [story, currentUserId, queryClient]);

  // Progression des images
  useEffect(() => {
    if (!story || story.media_type === "video") return;
    setProgress(0);
    const start = Date.now();
    const timer = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - start) / IMAGE_DURATION);
      setProgress(ratio * 100);
      if (ratio >= 1) {
        window.clearInterval(timer);
        next();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [story, next]);

  // Clavier
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex gap-1 px-2 pt-2">
        {group.stories.map((item, index) => (
          <div key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white transition-[width] duration-75"
              style={{
                width:
                  index < storyIndex ? "100%" : index === storyIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-3 py-3">
        <UserAvatar avatarPath={group.avatarUrl} name={group.username} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {group.displayName ?? group.username}
          </p>
          <p className="text-xs text-white/60">{timeAgo(story.created_at)}</p>
        </div>
        {group.userId === currentUserId ? (
          <button
            type="button"
            aria-label="Supprimer la story"
            className="rounded-full p-2 text-white/80"
            onClick={async () => {
              await deleteStory(story.id);
              await queryClient.invalidateQueries({ queryKey: ["stories"] });
              next();
            }}
          >
            <Trash2 className="size-5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="rounded-full p-2 text-white"
        >
          <X className="size-6" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {story.media_path && mediaUrl ? (
          story.media_type === "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              playsInline
              controls
              className="size-full object-contain"
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
              }}
              onEnded={next}
            />
          ) : (
            <img src={mediaUrl} alt={story.caption ?? "story"} className="size-full object-contain" />
          )
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/40 to-black p-8">
            <p className="text-center text-2xl font-semibold text-white">{story.caption}</p>
          </div>
        )}

        {story.media_path && story.caption ? (
          <p className="absolute inset-x-0 bottom-16 px-6 text-center text-base font-medium text-white drop-shadow">
            {story.caption}
          </p>
        ) : null}

        <button
          type="button"
          aria-label="Story précédente"
          onClick={previous}
          className="absolute inset-y-0 left-0 w-1/3"
        >
          <ChevronLeft className="ml-1 size-6 text-white/40" />
        </button>
        <button
          type="button"
          aria-label="Story suivante"
          onClick={next}
          className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end"
        >
          <ChevronRight className="mr-1 size-6 text-white/40" />
        </button>
      </div>
    </div>
  );
}
