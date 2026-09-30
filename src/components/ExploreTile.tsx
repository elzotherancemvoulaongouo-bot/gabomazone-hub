import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useSignedUrl } from "@/lib/media";

export function ExploreTile({ post }: { post: { id: string; caption: string | null; media_url: string | null; media_type: string | null } }) {
  const { data: url } = useSignedUrl(post.media_url);
  return <Link to="/watch/$postId" params={{ postId: post.id }} aria-label={`Voir ${post.caption || "la publication"}`} className="relative block aspect-[3/4] min-w-0 overflow-hidden rounded-md bg-muted">
    {url ? post.media_type === "video" ? <video src={url} muted playsInline preload="metadata" className="size-full object-cover" /> : <img src={url} alt={post.caption ?? "Publication"} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center p-2 text-center text-xs line-clamp-4">{post.caption || "Publication"}</span>}
    {post.media_type === "video" && <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground"><Play className="size-4 fill-current" /></span>}
    {post.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-2 py-1 text-xs text-foreground">{post.caption}</span>}
  </Link>;
}
