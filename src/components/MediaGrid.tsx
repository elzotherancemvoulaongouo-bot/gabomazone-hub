import { Link } from "@tanstack/react-router";
import { Media } from "@/components/Media";
import { useMediaViewer } from "@/components/MediaViewerContext";
import { fetchPost } from "@/lib/posts";
import type { FeedPost } from "@/components/PostCard";

export type MediaGridItem = {
  id: string;
  media_url: string | null;
  media_type: string | null;
  caption: string | null;
};

/** Grille 3 colonnes de médias, partagée entre profils, pages et groupes. */
export function MediaGrid({ items, empty, posts }: { items: MediaGridItem[]; empty: string; posts?: FeedPost[] | undefined }) {
  const viewer = useMediaViewer();
  if (items.length === 0)
    return <p className="text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((post) => (
        <Link
          key={post.id}
          to="/p/$postId"
          params={{ postId: post.id }}
          onClick={async (event) => { if (!post.media_url || !viewer || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); const selected = posts?.find((item) => item.id === post.id) ?? await fetchPost(post.id); if (selected) viewer.open({ post: selected, posts, kind: post.media_type === "video" ? "video" : "image", index: 0 }); }}
          className="aspect-square overflow-hidden rounded-md transition-opacity hover:opacity-90"
        >
          <Media
            path={post.media_url}
            type={post.media_type}
            alt={post.caption ?? "Publication"}
            fallbackText={post.caption}
            className="size-full object-cover"
            autoPlay={false}
          />
        </Link>
      ))}
    </div>
  );
}
