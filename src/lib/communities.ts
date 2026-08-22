import { supabase } from "@/integrations/supabase/client";

export type PageRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  category: string | null;
  phone: string | null;
  contact_email: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
};

export type GroupRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  category: string | null;
  is_private: boolean;
  created_at: string;

};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
};

export function slugify(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "communaute";
}

async function uniqueSlug(table: "pages" | "groups", name: string) {
  const base = slugify(name);
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const { data } = await supabase.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 1}`;
  }
  return `${base}-${Date.now()}`;
}

/* ---------------- Pages ---------------- */

export async function fetchPages() {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as PageRow[];
}

export async function fetchMyPages(userId: string) {
  const admin = await supabase.from("page_admins").select("page_id").eq("user_id", userId);
  if (admin.error) throw admin.error;
  const ids = (admin.data ?? []).map((r) => r.page_id);
  const filter = ids.length > 0 ? `owner_id.eq.${userId},id.in.(${ids.join(",")})` : `owner_id.eq.${userId}`;
  const { data, error } = await supabase.from("pages").select("*").or(filter);
  if (error) throw error;
  return (data ?? []) as PageRow[];
}

export async function fetchPageBySlug(slug: string) {
  const { data, error } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as PageRow) ?? null;
}

export async function createPage(ownerId: string, values: { name: string; description?: string }) {
  const slug = await uniqueSlug("pages", values.name);
  const { data, error } = await supabase
    .from("pages")
    .insert({ owner_id: ownerId, name: values.name.trim(), description: values.description?.trim() || null, slug })
    .select("*")
    .single();
  if (error) throw error;
  return data as PageRow;
}

export async function updatePage(id: string, values: Partial<PageRow>) {
  const { error } = await supabase.from("pages").update(values).eq("id", id);
  if (error) throw error;
}

export async function deletePage(id: string) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPageFollowers(pageId: string) {
  const { data, error } = await supabase.from("page_followers").select("user_id").eq("page_id", pageId);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id as string);
}

export async function followPage(pageId: string, userId: string) {
  const { error } = await supabase.from("page_followers").insert({ page_id: pageId, user_id: userId });
  if (error) throw error;
}

export async function unfollowPage(pageId: string, userId: string) {
  const { error } = await supabase
    .from("page_followers")
    .delete()
    .eq("page_id", pageId)
    .eq("user_id", userId);
  if (error) throw error;
}

export type AdminRow = {
  user_id: string;
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function fetchPageAdmins(pageId: string) {
  const { data, error } = await supabase.from("page_admins").select("user_id").eq("page_id", pageId);
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [] as AdminRow[];
  const profiles = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  if (profiles.error) throw profiles.error;
  const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return ids.map((id) => ({ user_id: id, profile: byId.get(id) ?? null })) as AdminRow[];
}

export async function addPageAdminByUsername(pageId: string, username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim().replace(/^@/, ""))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Aucun membre avec ce pseudo");
  const res = await supabase.from("page_admins").insert({ page_id: pageId, user_id: data.id });
  if (res.error) throw res.error;
}

export async function removePageAdmin(pageId: string, userId: string) {
  const { error } = await supabase
    .from("page_admins")
    .delete()
    .eq("page_id", pageId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ---------------- Groups ---------------- */

export async function fetchGroups() {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as GroupRow[];
}

export async function fetchMyGroups(userId: string) {
  const mem = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .eq("status", "approved");
  if (mem.error) throw mem.error;
  const ids = (mem.data ?? []).map((r) => r.group_id);
  const filter = ids.length > 0 ? `owner_id.eq.${userId},id.in.(${ids.join(",")})` : `owner_id.eq.${userId}`;
  const { data, error } = await supabase.from("groups").select("*").or(filter);
  if (error) throw error;
  return (data ?? []) as GroupRow[];
}

export async function fetchGroupBySlug(slug: string) {
  const { data, error } = await supabase.from("groups").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as GroupRow) ?? null;
}

export async function createGroup(
  ownerId: string,
  values: { name: string; description?: string; isPrivate: boolean },
) {
  const slug = await uniqueSlug("groups", values.name);
  const { data, error } = await supabase
    .from("groups")
    .insert({
      owner_id: ownerId,
      name: values.name.trim(),
      description: values.description?.trim() || null,
      is_private: values.isPrivate,
      slug,
    })
    .select("*")
    .single();
  if (error) throw error;
  const group = data as GroupRow;
  await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: ownerId, role: "admin", status: "approved" });
  return group;
}

export async function updateGroup(id: string, values: Partial<GroupRow>) {
  const { error } = await supabase.from("groups").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

export type GroupMemberWithProfile = GroupMemberRow & {
  profile: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, user_id, role, status, created_at")
    .eq("group_id", groupId);
  if (error) throw error;
  const rows = (data ?? []) as GroupMemberRow[];
  if (rows.length === 0) return [] as GroupMemberWithProfile[];
  const profiles = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", rows.map((r) => r.user_id));
  if (profiles.error) throw profiles.error;
  const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
}

export async function joinGroup(group: GroupRow, userId: string) {
  const { error } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "member",
    status: group.is_private ? "pending" : "approved",
  });
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function approveMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_members")
    .update({ status: "approved" })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setMemberRole(groupId: string, userId: string, role: "admin" | "member") {
  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}
