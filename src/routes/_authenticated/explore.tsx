import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/posts";
import { Media } from "@/components/Media";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explorer — Gabomazone" },
      {
        name: "description",
        content: "Explorez une grille de photos et vidéos publiées par la communauté Gabomazone.",
      },
      { property: "og:title", content: "Explorer — Gabomazone" },
      { property: "og:description", content: "Une grille de découvertes visuelles sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { data, isPending } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Explorer</h1>
      <div className="grid grid-cols-3 gap-1">
        {isPending
          ? Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md" />
            ))
          : (data ?? []).map((post) => (
              <Link
                key={post.id}
                to="/p/$postId"
                params={{ postId: post.id }}
                className="aspect-square overflow-hidden rounded-md"
              >
                <Media
                  path={post.media_url}
                  type={post.media_type}
                  alt={post.caption ?? "Publication"}
                  className="size-full object-cover"
                />
              </Link>
            ))}
      </div>
    </div>
  );
}