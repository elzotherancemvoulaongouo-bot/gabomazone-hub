import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFeedPage, FEED_PAGE_SIZE } from "@/lib/posts";
import type { FeedPost } from "@/components/PostCard";

/** Fil paginé (défilement infini) avec déduplication des publications. */
export function useInfiniteFeed() {
  const query = useInfiniteQuery({
    queryKey: ["feed", "infinite"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPost[]) =>
      lastPage.length < FEED_PAGE_SIZE ? undefined : (lastPage[lastPage.length - 1]?.created_at ?? undefined),
  });

  const seen = new Set<string>();
  const posts: FeedPost[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const post of page) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      posts.push(post);
    }
  }

  return { ...query, posts };
}