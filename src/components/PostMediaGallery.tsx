import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Media } from "@/components/Media";
import { useMediaViewer } from "@/components/MediaViewerContext";
import type { FeedPost } from "@/components/PostCard";
import { cn } from "@/lib/utils";

export type PostMediaItem = { path: string; media_type: string | null };

export function PostMediaGallery({ items, alt, className, post, posts }: { items: PostMediaItem[]; alt: string; className?: string; post: FeedPost; posts?: FeedPost[] }) {
  const viewer = useMediaViewer();
  const [singleRatio, setSingleRatio] = useState(1);
  if (!items.length) return null;
  const single = items.length === 1;
  const visible = items.slice(0, 4);
  const open = (itemIndex: number) => viewer?.open({ post, posts, kind: items[itemIndex]?.media_type === "video" ? "video" : "image", index: items.filter((item, position) => position < itemIndex && item.media_type === items[itemIndex]?.media_type).length });
  return <>
    <div className={cn(single ? "w-full" : "grid grid-cols-2 gap-1 overflow-hidden", items.length === 3 && "[&>*:first-child]:row-span-2", className)}>
      {visible.map((item, index) => <div key={`${item.path}-${index}`} className={cn("relative min-w-0 overflow-hidden bg-muted", !single && "aspect-square", items.length === 3 && index === 0 && "row-span-2 !aspect-auto")}>
        {item.media_type === "video" ? <div className="relative"><Media path={item.path} type="video" alt={alt} className="w-full" /><Button variant="ghost" type="button" onClick={() => open(index)} aria-label={`Ouvrir la vidéo ${index + 1} en plein écran`} className="absolute inset-0 z-10 size-full rounded-none bg-transparent hover:bg-transparent" /></div> : <Button variant="ghost" type="button" onClick={() => open(index)} aria-label={`Ouvrir le média ${index + 1}`} className={cn("block h-auto w-full rounded-none p-0", !single && "size-full")} style={single ? { aspectRatio: singleRatio } : undefined}>
          <Media path={item.path} type="image" alt={alt} onImageLoad={(image) => { if (single) setSingleRatio(Math.max(4 / 5, Math.min(1.91, image.naturalWidth / image.naturalHeight))); }} className="size-full object-cover" />
        </Button>}
        {index === 3 && items.length > 4 ? <Button variant="secondary" onClick={() => open(3)} className="absolute inset-0 z-20 size-full rounded-none bg-background/70 text-2xl font-bold">+{items.length - 4}</Button> : null}
      </div>)}
    </div>
  </>;
}