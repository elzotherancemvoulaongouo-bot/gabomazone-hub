import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadMessagesCount } from "@/lib/messages";

export type NotificationType = "message" | "friend_accepted" | "like" | "comment";

export type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  conversation_id: string | null;
  preview: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const SELECT =
  "id, user_id, actor_id, type, post_id, conversation_id, preview, read_at, created_at, actor:profiles!notifications_actor_profile_fkey(username, display_name, avatar_url)";

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .neq("type", "message")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationRow[];
}


export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markNotificationRead(id: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
}

/** Mark all message notifications of a conversation as read. */
export async function markConversationNotificationsRead(conversationId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("type", "message")
    .is("read_at", null);
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationsCount(enabled: boolean) {
  const query = useNotifications(enabled);
  return query.data?.filter((n) => !n.read_at).length ?? 0;
}

/** Unread count for a given notification type (e.g. new private messages). */
export function useUnreadCountByType(type: NotificationType, enabled: boolean) {
  const query = useNotifications(enabled);
  return query.data?.filter((n) => !n.read_at && n.type === type).length ?? 0;
}

/** Subscribe once to realtime notification inserts for the signed-in user. */
export function useNotificationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function notificationLabel(n: NotificationRow) {
  const who = n.actor?.display_name || n.actor?.username || "Quelqu'un";
  switch (n.type) {
    case "message":
      return `${who} vous a envoyé un message`;
    case "friend_accepted":
      return `${who} a accepté votre demande d'ami`;
    case "like":
      return `${who} a aimé votre publication`;
    case "comment":
      return `${who} a commenté votre publication`;
    default:
      return who;
  }
}

/**
 * Compteur INDÉPENDANT des messages privés non lus (icône 💬).
 * Il ne dépend pas des notifications générales (icône 🔔).
 */
export function useUnreadMessagesCount(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["unread-messages", userId],
    queryFn: () => fetchUnreadMessagesCount(userId!),
    enabled: Boolean(userId),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`unread-messages:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query.data ?? 0;
}
