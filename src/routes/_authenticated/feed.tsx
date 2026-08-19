import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { useInfiniteFeed } from "@/lib/feed";
import { PostCard } from "@/components/PostCard";
import { FeedComposer } from "@/components/FeedComposer";
import { StoriesBar } from "@/components/StoriesBar";
import { useHiddenPostIds, useBlockedIds } from "@/lib/social";
import { useSettings } from "@/lib/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Fil d'actualité — Gabomazone" },
      {
        name: "description",
        content: "Découvrez les dernières photos et vidéos partagées par la communauté Gabomazone.",
      },
      { property: "og:title", content: "Fil d'actualité — Gabomazone" },
      { property: "og:description", content: "Les derniers moments partagés sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = Route.useRouteContext();
  const { posts: allPosts, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteFeed();
  const { data: hidden } = useHiddenPostIds(user.id);
  const { data: blocked } = useBlockedIds(user.id);
  const { data: settings } = useSettings(user.id);
  const sentinel = useRef<HTMLDivElement>(null);

  const posts = allPosts.filter(
    (p) => !(hidden ?? []).includes(p.id) && !(blocked ?? []).includes(p.user_id),
  );

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Fil d'actualité Gabomazone</h1>
      <StoriesBar userId={user.id} />
      <FeedComposer userId={user.id} defaultVisibility={settings?.post_visibility ?? "public"} />
      {isPending ? (
        <>
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </>
      ) : posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user.id} />)
      ) : (
        <div className="rounded-2xl border border-border/70 p-10 text-center brand-surface">
          <Camera className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune publication pour l'instant. Soyez le premier !
          </p>
          <Button asChild className="mt-5">
            <Link to="/create">Publier une photo ou vidéo</Link>
          </Button>
        </div>
      )}

      <div ref={sentinel} aria-hidden className="h-1" />
      {isFetchingNextPage ? <Skeleton className="h-72 w-full rounded-2xl" /> : null}
    </div>
  );
}