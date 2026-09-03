import { useState } from "react";
import { X } from "lucide-react";
import { Media } from "@/components/Media";
import { cn } from "@/lib/utils";

export type PostMediaItem = { path: string; media_type: string | null };

/** Galerie de médias : défilement horizontal + visionneuse plein écran. */
export function PostMediaGallery({
  items,
  alt,
  className,
  onOpenVideo,
}: {
  items: PostMediaItem[];
  alt: string;
  className?: string;
  onOpenVideo?: () => void;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth",
          items.length > 1 ? "gap-1" : "",
          className,
        )}
      >
        {items.map((item, index) => {
          const isVideo = item.media_type === "video";
          return (
          <div
            key={`${item.path}-${index}`}
            className={cn("relative shrink-0 snap-center", items.length > 1 ? "w-[86%]" : "w-full")}
          >
            {isVideo ? (
              <Media
                path={item.path}
                type="video"
                alt={alt}
                className="w-full bg-black"
                {...(onOpenVideo ? { onOpenVideo } : {})}
              />
            ) : (
              <button
                type="button"
                onClick={() => setViewer(index)}
                className="block w-full"
                aria-label={`Ouvrir le média ${index + 1}`}
              >
                <Media
                  path={item.path}
                  type={item.media_type ?? "image"}
                  alt={alt}
                  className="aspect-square w-full bg-muted object-cover"
                />
              </button>
            )}
            {items.length > 1 ? (
              <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium">
                {index + 1}/{items.length}
              </span>
            ) : null}
          </div>
          );
        })}
      </div>

      {viewer !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-2">
          <button
            type="button"
            onClick={() => setViewer(null)}
            aria-label="Fermer la visionneuse"
            className="absolute right-3 top-3 rounded-full bg-secondary p-2"
          >
            <X className="size-6" />
          </button>
          <Media
            path={items[viewer]!.path}
            type={items[viewer]!.media_type ?? "image"}
            alt={alt}
            className="max-h-[92dvh] w-full object-contain"
          />
        </div>
      ) : null}
    </>
  );
}