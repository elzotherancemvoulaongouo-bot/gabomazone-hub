import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Media } from "@/components/Media";
import { cn } from "@/lib/utils";

export type PostMediaItem = { path: string; media_type: string | null };

export function PostMediaGallery({ items, alt, className }: { items: PostMediaItem[]; alt: string; className?: string; onOpenVideo?: () => void }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [singleRatio, setSingleRatio] = useState(1);
  if (!items.length) return null;
  const single = items.length === 1;
  const visible = items.slice(0, 4);
  return <>
    <div className={cn(single ? "w-full" : "grid grid-cols-2 gap-1 overflow-hidden", items.length === 3 && "[&>*:first-child]:row-span-2", className)}>
      {visible.map((item, index) => <div key={`${item.path}-${index}`} className={cn("relative min-w-0 overflow-hidden bg-muted", !single && (items.length === 2 ? "aspect-square" : "aspect-square"), items.length === 3 && index === 0 && "row-span-2 !aspect-auto")}>
        {item.media_type === "video" ? <Media path={item.path} type="video" alt={alt} className="w-full" /> : <Button variant="ghost" type="button" onClick={() => setViewer(index)} aria-label={`Ouvrir le média ${index + 1}`} className={cn("block h-auto w-full rounded-none p-0", !single && "size-full")}>
          <Media path={item.path} type="image" alt={alt} onImageLoad={(image) => { if (single) setSingleRatio(Math.max(4 / 5, Math.min(1.91, image.naturalWidth / image.naturalHeight))); }} className={cn("w-full object-cover", !single && "size-full")} />
        </Button>}
        {index === 3 && items.length > 4 ? <Button variant="secondary" onClick={() => setViewer(3)} className="absolute inset-0 size-full rounded-none bg-background/70 text-2xl font-bold">+{items.length - 4}</Button> : null}
      </div>)}
    </div>
    {viewer !== null && items[viewer] ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 p-3" role="dialog" aria-label="Photo agrandie">
      <Button variant="secondary" size="icon" onClick={() => setViewer(null)} aria-label="Fermer la visionneuse" className="absolute right-3 top-3 z-10"><X className="size-5" /></Button>
      <div className="flex max-h-[88dvh] w-full flex-col items-center justify-center gap-3">
        <Media path={items[viewer].path} type={items[viewer].media_type} alt={alt} className="max-h-[78dvh] max-w-full object-contain" eager />
        {items.length > 1 ? <div className="flex items-center gap-4"><Button variant="secondary" disabled={viewer === 0} onClick={() => setViewer(viewer - 1)} aria-label="Photo précédente">‹</Button><span>{viewer + 1} / {items.length}</span><Button variant="secondary" disabled={viewer === items.length - 1} onClick={() => setViewer(viewer + 1)} aria-label="Photo suivante">›</Button></div> : null}
      </div>
    </div> : null}
  </>;
}