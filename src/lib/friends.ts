import { supabase } from "@/integrations/supabase/client";

export type FriendRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
};

export type FriendProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
};

const PROFILE_FIELDS = "id, username, display_name, avatar_url, city, country";

export async function fetchMyRequests(userId: string) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status, created_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FriendRequestRow[];
}

export async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as FriendProfile[];
  const { data, error } = await supabase.from("profiles").select(PROFILE_FIELDS).in("id", ids);
  if (error) throw error;
  return (data ?? []) as FriendProfile[];
}

export async function searchProfiles(term: string, excludeId: string) {
  const q = term.trim();
  if (!q) return [] as FriendProfile[];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("id", excludeId)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as FriendProfile[];
}

export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: senderId, receiver_id: receiverId, status: "pending" });
  if (error) throw error;
}

export async function respondToRequest(id: string, status: "accepted" | "declined") {
  const { error } = await supabase.from("friend_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function removeRequest(id: string) {
  const { error } = await supabase.from("friend_requests").delete().eq("id", id);
  if (error) throw error;
}

export function relationOf(requests: FriendRequestRow[], me: string, other: string) {
  const row = requests.find(
    (r) =>
      (r.sender_id === me && r.receiver_id === other) ||
      (r.sender_id === other && r.receiver_id === me),
  );
  if (!row) return { state: "none" as const, row: null };
  if (row.status === "accepted") return { state: "friends" as const, row };
  if (row.status === "pending")
    return { state: row.sender_id === me ? ("sent" as const) : ("received" as const), row };
  return { state: "none" as const, row };
}
