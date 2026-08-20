import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { useSignedUrl, timeAgo } from "@/lib/media";
import { deleteStory, markStorySeen, STORY_BACKGROUNDS, type StoryGroup } from "@/lib/stories";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const IMAGE_DURATION = 5000;
const LONG_PRESS_MS = 180;

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
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressTimer = useRef<number | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const { data: mediaUrl } = useSignedUrl(story?.media_path);

  const next = useCallback(() => {
    setProgress(0);
    const current = groups[groupIndex];
    if (current && storyIndex + 1 < current.stories.length) {
      setStoryIndex(storyIndex + 1);
      return;
    }
    if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [groupIndex, storyIndex, groups, onClose]);

  const previous = useCallback(() => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
    }
  }, [groupIndex, storyIndex, groups]);

  // Marquer comme vue
  useEffect(() => {
    if (!story) return;
    void markStorySeen(story.id, currentUserId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["stories"] }),
    );
  }, [story, currentUserId, queryClient]);

  // Minuterie des images (avec pause/reprise exacte)
  useEffect(() => {
    if (!story || story.media_type === "video") return;
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!paused) elapsed += delta;
      const ratio = Math.min(1, elapsed / IMAGE_DURATION);
      setProgress(ratio * 100);
      if (ratio >= 1) {
        next();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story, next, paused]);

  // Pause/reprise vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => undefined);
  }, [paused, mediaUrl]);

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

  const startPress = useCallback(() => {
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      setPaused(true);
    }, LONG_PRESS_MS);
  }, []);

  const endPress = useCallback(
    (action: () => void) => () => {
      if (pressTimer.current !== null) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
        action();
        return;
      }
      setPaused(false);
    },
    [],
  );

  if (!group || !story) return null;

  const bg = STORY_BACKGROUNDS.find((b) => b.id === story.background) ?? STORY_BACKGROUNDS[0];

  return (
    <div className="fixed inset-0 z-[70] flex select-none flex-col bg-black">
      <div className="flex gap-1 px-2 pt-2">
        {group.stories.map((item, index) => (
          <div key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white"
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
            aria-label="Supprimer le statut"
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
              key={story.id}
              ref={videoRef}
              src={mediaUrl}
              autoPlay
              playsInline
              className="size-full object-contain"
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
              }}
              onEnded={next}
            />
          ) : (
            <img src={mediaUrl} alt={story.caption ?? "statut"} className="size-full object-contain" />
          )
        ) : (
          <div className={cn("flex size-full items-center justify-center p-8", bg.className)}>
            <p className="text-center text-2xl font-bold text-white">{story.caption}</p>
          </div>
        )}

        {story.media_path && story.caption ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-16 px-6 text-center text-base font-medium text-white drop-shadow">
            {story.caption}
          </p>
        ) : null}

        <button
          type="button"
          aria-label="Statut précédent"
          onPointerDown={startPress}
          onPointerUp={endPress(previous)}
          onPointerLeave={() => setPaused(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-y-0 left-0 w-1/3 touch-none"
        >
          <ChevronLeft className="ml-1 size-6 text-white/40" />
        </button>
        <button
          type="button"
          aria-label="Statut suivant"
          onPointerDown={startPress}
          onPointerUp={endPress(next)}
          onPointerLeave={() => setPaused(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-y-0 right-0 flex w-2/3 touch-none items-center justify-end"
        >
          <ChevronRight className="mr-1 size-6 text-white/40" />
        </button>

        {paused ? (
          <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            En pause
          </span>
        ) : null}
      </div>
    </div>
  );
}
