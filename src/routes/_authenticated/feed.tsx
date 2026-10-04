import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useInfiniteFeed, fetchPostScores, rankByScores } from "@/lib/feed";
import { useAlgorithmSettings } from "@/lib/algorithms";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { LazyMount } from "@/components/LazyMount";
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

type Tab = "for-you" | "recent";

function FeedPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("for-you");
  const { posts: recentPosts, data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteFeed();
  const { data: hidden } = useHiddenPostIds(user.id);
  const { data: blocked } = useBlockedIds(user.id);
  const { data: settings } = useSettings(user.id);
  const { data: algos } = useAlgorithmSettings();
  const feedAlgo = algos?.find((a) => a.key === "feed");
  const rankingOn = tab === "for-you" && feedAlgo?.enabled !== false;
  const sentinel = useRef<HTMLDivElement>(null);

  const ids = recentPosts.map((p) => p.id);
  const { data: scores } = useQuery({
    queryKey: ["post-scores", ids],
    queryFn: () => fetchPostScores(ids),
    enabled: rankingOn && ids.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const ordered = useMemo<FeedPost[]>(() => {
    if (!rankingOn) return recentPosts;
    const seen = new Set<string>();
    const pages = (data?.pages ?? []).map((page) =>
      page.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))),
    );
    return rankByScores(pages, scores, Number(feedAlgo?.weights['max_same_author_in_row'] ?? 2));
  }, [rankingOn, recentPosts, data, scores, feedAlgo]);

  const posts = ordered.filter(
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
      <div role="tablist" className="flex gap-2">
        {(
          [
            ["for-you", "Pour vous"],
            ["recent", "Récents"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={tab === key}
            size="sm"
            variant={tab === key ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {isPending ? (
        <>
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </>
      ) : posts.length > 0 ? (
        posts.map((post, index) => (
          <LazyMount
            key={post.id}
            keepMounted={index < 3}
            placeholderHeight={post.media_url ? 520 : 200}
          >
            <PostCard post={post} currentUserId={user.id} contextPosts={posts} />
          </LazyMount>
        ))
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
