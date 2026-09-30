import { supabase } from "@/integrations/supabase/client";
import { POST_SELECT } from "@/lib/posts";
import { rankPosts } from "@/lib/feed";
import type { FeedPost } from "@/components/PostCard";

/** Public posts by people outside the viewer's friends/follows, ranked for discovery. */
export async function fetchRecommendations(userId: string) {
  const [posts, follows, friends] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);
  if (posts.error) throw posts.error;
  const familiar = new Set([
    userId,
    ...(follows.data ?? []).map((row) => row.following_id),
    ...(friends.data ?? []).map((row) =>
      row.sender_id === userId ? row.receiver_id : row.sender_id,
    ),
  ]);
  return rankPosts(
    ((posts.data ?? []) as unknown as FeedPost[]).filter((post) => !familiar.has(post.user_id)),
    "popular",
  );
}
