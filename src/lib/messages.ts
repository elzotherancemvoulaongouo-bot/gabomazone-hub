import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET } from "@/lib/media";
import type { FriendProfile } from "@/lib/friends";

export const MAX_VOICE_SECONDS = 300;

export type ConversationRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  last_message_preview: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "voice";
  content: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
};

const PROFILE_FIELDS = "id, username, display_name, avatar_url, city, country";

export function otherUserId(conversation: ConversationRow, me: string) {
  return conversation.user_a === me ? conversation.user_b : conversation.user_a;
}

export async function fetchConversations(me: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, last_message_at, last_message_preview")
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ConversationRow[];
  const ids = [...new Set(rows.map((r) => otherUserId(r, me)))];
  let profiles: FriendProfile[] = [];
  if (ids.length > 0) {
    const res = await supabase.from("profiles").select(PROFILE_FIELDS).in("id", ids);
    if (res.error) throw res.error;
    profiles = (res.data ?? []) as FriendProfile[];
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return rows.map((row) => ({ conversation: row, profile: byId.get(otherUserId(row, me)) ?? null }));
}

export async function getOrCreateConversation(me: string, other: string) {
  const [a, b] = me < other ? [me, other] : [other, me];
  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id as string;

  const created = await supabase
    .from("conversations")
    .insert({ user_a: a, user_b: b })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id as string;
}

export async function fetchConversation(id: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, last_message_at, last_message_preview")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function fetchProfile(id: string) {
  const { data, error } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).single();
  if (error) throw error;
  return data as FriendProfile;
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, kind, content, audio_path, duration_seconds, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

async function touchConversation(conversationId: string, preview: string) {
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: preview })
    .eq("id", conversationId);
}

export async function sendTextMessage(conversationId: string, senderId: string, content: string) {
  const text = content.trim();
  if (!text) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    kind: "text",
    content: text,
  });
  if (error) throw error;
  await touchConversation(conversationId, text.slice(0, 120));
}

export async function sendVoiceMessage(
  conversationId: string,
  senderId: string,
  blob: Blob,
  durationSeconds: number,
) {
  const ext = blob.type.includes("mp4") ? "m4a" : "webm";
  const path = `${senderId}/voice/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
  if (upload.error) throw upload.error;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    kind: "voice",
    audio_path: path,
    duration_seconds: Math.round(durationSeconds),
  });
  if (error) throw error;
  await touchConversation(conversationId, "🎤 Note vocale");
}

export async function markConversationRead(conversationId: string, me: string) {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", me)
    .is("read_at", null);
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Nombre de messages privés non lus reçus par l'utilisateur. */
export async function fetchUnreadMessagesCount(me: string) {
  const convs = await supabase
    .from("conversations")
    .select("id")
    .or(`user_a.eq.${me},user_b.eq.${me}`);
  if (convs.error) throw convs.error;
  const ids = (convs.data ?? []).map((c) => c.id as string);
  if (ids.length === 0) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", me)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
