import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/components/PostCard";

export const POST_SELECT =
  "id, user_id, media_url, media_type, caption, location, created_at, author:profiles!posts_author_profile_fkey(username, display_name, avatar_url), likes(user_id), comments(count)";

export async function fetchFeed() {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function fetchPost(postId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as FeedPost) ?? null;
}

export async function fetchUserPosts(userId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function fetchProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}