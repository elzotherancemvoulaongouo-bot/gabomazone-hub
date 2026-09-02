import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useInfiniteFeed } from "@/lib/feed";
import { fetchPost } from "@/lib/posts";
import { PostMediaGallery } from "@/components/PostMediaGallery";
import { UserAvatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/media";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "@/components/PostCard";

export const Route = createFileRoute("/_authenticated/watch/$postId")({
  head: () => ({
    meta: [
      { title: "Lecture vidéo — Gabomazone" },
      {
        name: "description",
        content: "Regardez les vidéos et photos de la communauté Gabomazone en plein écran.",
      },
      { property: "og:title", content: "Lecture vidéo — Gabomazone" },
      { property: "og:description", content: "Vidéos et photos en lecture continue sur Gabomazone." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const sentinel = useRef<HTMLDivElement>(null);
  const { posts, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteFeed();
  const { data: current } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => fetchPost(postId),
  });

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

  const rest = posts.filter((p) => p.id !== postId && mediaOf(p).length > 0);
  const ordered: FeedPost[] = current ? [current, ...rest] : rest;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/feed" })}>
          <ArrowLeft className="mr-1 size-4" /> Retour au fil
        </Button>
      </div>
      <h1 className="sr-only">Lecture continue</h1>

      {isPending && !current ? <Skeleton className="h-[60vh] w-full rounded-2xl" /> : null}

      {ordered.map((post, index) => (
        <LazyMount key={post.id} keepMounted={index < 2} placeholderHeight={520}>
        <article className="overflow-hidden rounded-2xl border border-border/70 brand-surface">
          <PostMediaGallery items={mediaOf(post)} alt={post.caption ?? "Média"} />
          <div className="flex items-center gap-3 px-4 py-3">
            <UserAvatar avatarPath={post.author?.avatar_url} name={post.author?.username} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {post.author?.display_name || post.author?.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          {post.caption ? (
            <p className="px-4 pb-4 text-sm leading-relaxed">{post.caption}</p>
          ) : null}
        </article>
      ))}

      <div ref={sentinel} aria-hidden className="h-1" />
      {isFetchingNextPage ? <Skeleton className="h-72 w-full rounded-2xl" /> : null}
    </div>
  );
}

function mediaOf(post: FeedPost) {
  if (post.media && post.media.length > 0) {
    return [...post.media]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({ path: m.path, media_type: m.media_type }));
  }
  return post.media_url ? [{ path: post.media_url, media_type: post.media_type }] : [];
}