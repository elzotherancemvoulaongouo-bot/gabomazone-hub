import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/components/PostCard";
import { MEDIA_BUCKET } from "@/lib/media";

export const POST_SELECT =
  "id, user_id, page_id, group_id, media_url, media_type, caption, location, created_at, author:profiles!posts_author_profile_fkey(username, display_name, avatar_url), page:pages!posts_page_id_fkey(name, slug, avatar_url), group:groups!posts_group_id_fkey(name, slug), likes(user_id), comments(count)";

export async function fetchFeed() {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("group_id", null)
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
    .is("page_id", null)
    .is("group_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function fetchPagePosts(pageId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function fetchGroupPosts(groupId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedPost[];
}

export async function uploadPostMedia(userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, type: file.type.startsWith("video") ? "video" : "image" };
}

export async function updatePost(
  postId: string,
  values: { caption: string | null; location: string | null; media_url?: string | null; media_type?: string | null },
) {
  const { error } = await supabase.from("posts").update(values).eq("id", postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
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
