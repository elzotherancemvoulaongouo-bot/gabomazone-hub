import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFeedPage, FEED_PAGE_SIZE } from "@/lib/posts";
import type { FeedPost } from "@/components/PostCard";

/**
 * Stratégies d'affichage du fil.
 * « recent » est active aujourd'hui ; les autres sont prêtes pour un
 * classement personnalisé (comptes suivis, interactions, popularité, centres d'intérêt).
 */
export type FeedStrategy = "recent" | "following" | "popular" | "for-you";

export type FeedSignals = {
  /** Auteurs suivis / amis de l'utilisateur. */
  followedIds?: string[];
  /** Auteurs avec lesquels l'utilisateur interagit souvent. */
  affinityIds?: string[];
};

/** Score d'une publication : fraîcheur + engagement + affinité. Extensible. */
export function scorePost(post: FeedPost, signals: FeedSignals = {}) {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const freshness = 1 / (1 + ageHours / 12);
  const engagement = post.likes.length * 1 + (post.comments[0]?.count ?? 0) * 2;
  const followed = signals.followedIds?.includes(post.user_id) ? 1 : 0;
  const affinity = signals.affinityIds?.includes(post.user_id) ? 1 : 0;
  return freshness * 10 + Math.log1p(engagement) * 3 + followed * 4 + affinity * 2;
}

/** Applique la stratégie choisie à une liste déjà chargée (ordre chronologique). */
export function rankPosts(
  posts: FeedPost[],
  strategy: FeedStrategy,
  signals: FeedSignals = {},
): FeedPost[] {
  if (strategy === "recent") return posts;
  if (strategy === "following") {
    const ids = new Set(signals.followedIds ?? []);
    return posts.filter((p) => ids.has(p.user_id));
  }
  return [...posts].sort((a, b) => scorePost(b, signals) - scorePost(a, signals));
}

/** Fil paginé (défilement infini) avec déduplication et classement pluggable. */
export function useInfiniteFeed(strategy: FeedStrategy = "recent", signals: FeedSignals = {}) {
  const query = useInfiniteQuery({
    queryKey: ["feed", "infinite"],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPost[]) =>
      lastPage.length < FEED_PAGE_SIZE
        ? undefined
        : (lastPage[lastPage.length - 1]?.created_at ?? undefined),
    staleTime: 30_000,
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

  return { ...query, posts: rankPosts(posts, strategy, signals) };
}

// ---------------------------------------------------------------------------
// ALGO FIL D'ACTUALITÉ (« Pour vous »)
// Le score est calculé par la base (fonction score_posts) avec les poids de la
// table algorithm_settings : fraîcheur + réactions + commentaires + partages +
// affinité (amis, suivis, pages/groupes, interactions passées) − pénalités
// (signalements, spam probable). Ici on trie chaque lot par score, puis on
// applique une règle de diversité : jamais plus de N posts de suite du même auteur.
// ---------------------------------------------------------------------------

export type PostScore = { post_id: string; score: number; reason: string | null };

export async function fetchPostScores(ids: string[]) {
  if (ids.length === 0) return new Map<string, PostScore>();
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.rpc("score_posts", { _ids: ids });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.post_id, row as PostScore]));
}

/** Diversité : déplace un post plus loin si l'auteur apparaît déjà `maxInRow` fois de suite. */
export function diversify(posts: FeedPost[], maxInRow = 2): FeedPost[] {
  const pending = [...posts];
  const out: FeedPost[] = [];
  while (pending.length) {
    const tail = out.slice(-maxInRow);
    const blocked = tail.length === maxInRow && tail.every((p) => p.user_id === tail[0]!.user_id);
    const index = blocked ? pending.findIndex((p) => p.user_id !== tail[0]!.user_id) : 0;
    out.push(...pending.splice(index === -1 ? 0 : index, 1));
  }
  return out;
}

/** Trie lot par lot (l'ordre des posts déjà vus ne bouge pas en défilant). */
export function rankByScores(
  pages: FeedPost[][],
  scores: Map<string, PostScore> | undefined,
  maxInRow = 2,
) {
  if (!scores || scores.size === 0) return pages.flat();
  return pages.flatMap((page) =>
    diversify(
      [...page].sort(
        (a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0),
      ),
      maxInRow,
    ),
  );
}
