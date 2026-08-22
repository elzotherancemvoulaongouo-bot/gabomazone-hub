import { Link } from "@tanstack/react-router";
import { Media } from "@/components/Media";

export type MediaGridItem = {
  id: string;
  media_url: string | null;
  media_type: string | null;
  caption: string | null;
};

/** Grille 3 colonnes de médias, partagée entre profils, pages et groupes. */
export function MediaGrid({ items, empty }: { items: MediaGridItem[]; empty: string }) {
  if (items.length === 0)
    return <p className="text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((post) => (
        <Link
          key={post.id}
          to="/p/$postId"
          params={{ postId: post.id }}
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
