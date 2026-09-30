import { supabase } from "@/integrations/supabase/client";
import { fetchMyRequests, fetchProfilesByIds } from "@/lib/friends";

export type ActionButtonType =
  | "message"
  | "whatsapp"
  | "call"
  | "email"
  | "contact"
  | "learn_more"
  | "signup"
  | "book"
  | "shop"
  | "watch_video";

export type ActionButton = { type: ActionButtonType; value?: string };

export const ACTION_BUTTON_OPTIONS: { type: ActionButtonType; label: string; needs: "none" | "phone" | "email" | "url"; placeholder?: string }[] = [
  { type: "message", label: "Message", needs: "none" },
  { type: "whatsapp", label: "WhatsApp", needs: "phone", placeholder: "Numéro WhatsApp (ex. +24177000000)" },
  { type: "call", label: "Appeler", needs: "phone", placeholder: "Numéro de téléphone" },
  { type: "email", label: "E-mail", needs: "email", placeholder: "adresse@exemple.com" },
  { type: "contact", label: "Nous contacter", needs: "url", placeholder: "https://…" },
  { type: "learn_more", label: "En savoir plus", needs: "url", placeholder: "https://…" },
  { type: "signup", label: "S'inscrire", needs: "url", placeholder: "https://…" },
  { type: "book", label: "Réserver", needs: "url", placeholder: "https://…" },
  { type: "shop", label: "Acheter", needs: "url", placeholder: "https://…" },
  { type: "watch_video", label: "Voir la vidéo", needs: "url", placeholder: "https://…" },
];

export function actionOption(type: ActionButtonType) {
  return ACTION_BUTTON_OPTIONS.find((o) => o.type === type) ?? ACTION_BUTTON_OPTIONS[0]!;
}

export function parseActionButtons(raw: unknown): ActionButton[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is ActionButton => Boolean(b && typeof b === "object" && "type" in b))
    .filter((b) => ACTION_BUTTON_OPTIONS.some((o) => o.type === b.type))
    .slice(0, 2);
}

/** Returns the href for a non-message button, or null if not usable. */
export function actionHref(b: ActionButton): string | null {
  const v = (b.value ?? "").trim();
  if (!v) return null;
  switch (b.type) {
    case "call":
      return `tel:${v.replace(/\s+/g, "")}`;
    case "whatsapp":
      return `https://wa.me/${v.replace(/[^0-9]/g, "")}`;
    case "email":
      return `mailto:${v}`;
    case "message":
      return null;
    default:
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }
}

export async function saveActionButtons(pageId: string, buttons: ActionButton[]) {
  const { error } = await supabase
    .from("pages")
    .update({ action_buttons: buttons.slice(0, 2) } as never)
    .eq("id", pageId);
  if (error) throw error;
}

/* ---------- Friends & invitations ---------- */

export async function fetchMyFriends(userId: string) {
  const reqs = await fetchMyRequests(userId);
  const ids = reqs
    .filter((r) => r.status === "accepted")
    .map((r) => (r.sender_id === userId ? r.receiver_id : r.sender_id));
  return fetchProfilesByIds([...new Set(ids)]);
}

type Target = { pageId?: string; groupId?: string };

export async function fetchSentInvites(userId: string, target: Target) {
  let q = supabase.from("community_invites" as never).select("invitee_id").eq("inviter_id", userId);
  q = target.pageId ? q.eq("page_id", target.pageId) : q.eq("group_id", target.groupId!);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as { invitee_id: string }[]).map((r) => r.invitee_id);
}

export async function sendInvites(userId: string, target: Target, inviteeIds: string[]) {
  if (inviteeIds.length === 0) return;
  const rows = inviteeIds.map((id) => ({
    inviter_id: userId,
    invitee_id: id,
    page_id: target.pageId ?? null,
    group_id: target.groupId ?? null,
  }));
  const { error } = await supabase.from("community_invites" as never).insert(rows as never);
  if (error) throw error;
}

/* ---------- Saved / blocked / reports ---------- */

export async function fetchFlags(userId: string, target: Target) {
  let q = supabase.from("community_user_flags" as never).select("flag").eq("user_id", userId);
  q = target.pageId ? q.eq("page_id", target.pageId) : q.eq("group_id", target.groupId!);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as { flag: string }[]).map((r) => r.flag);
}

export async function setFlag(userId: string, target: Target, flag: "saved" | "blocked", on: boolean) {
  if (on) {
    const { error } = await supabase.from("community_user_flags" as never).insert({
      user_id: userId,
      page_id: target.pageId ?? null,
      group_id: target.groupId ?? null,
      flag,
    } as never);
    if (error) throw error;
  } else {
    let q = supabase.from("community_user_flags" as never).delete().eq("user_id", userId).eq("flag", flag);
    q = target.pageId ? q.eq("page_id", target.pageId) : q.eq("group_id", target.groupId!);
    const { error } = await q;
    if (error) throw error;
  }
}

export async function reportCommunity(userId: string, target: Target, reason: string) {
  const { error } = await supabase.from("community_reports" as never).insert({
    reporter_id: userId,
    page_id: target.pageId ?? null,
    group_id: target.groupId ?? null,
    reason,
  } as never);
  if (error) throw error;
}
