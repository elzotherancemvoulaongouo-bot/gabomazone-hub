/**
 * Tests des règles d'accès (RLS) sur la vraie base.
 * - Visiteur non connecté : toujours exécutés.
 * - Membre connecté : exécutés si TEST_ACCESS_TOKEN et TEST_USER_ID sont fournis.
 * Lancer : bunx vitest run tests/rls
 * Aucun test n'écrit de donnée : chaque tentative d'écriture doit être refusée.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "../../src/integrations/supabase/types";

const URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const KEY = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
const TOKEN = process.env["TEST_ACCESS_TOKEN"];
const USER_ID = process.env["TEST_USER_ID"];
const FAKE = "00000000-0000-0000-0000-000000000001";

function client(token?: string): SupabaseClient<Database> {
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${KEY}`) h.delete("Authorization");
        h.set("apikey", KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function privateGroupIds(db: SupabaseClient<Database>) {
  const { data } = await db.from("groups").select("id").eq("is_private", true);
  return new Set((data ?? []).map((g) => g.id));
}

describe("Visiteur non connecté", () => {
  const anon = client();

  it("ne voit aucune conversation ni aucun message", async () => {
    const convs = await anon.from("conversations").select("id").limit(5);
    const msgs = await anon.from("messages").select("id").limit(5);
    expect(convs.data ?? []).toHaveLength(0);
    expect(msgs.data ?? []).toHaveLength(0);
  });

  it("ne voit que des publications publiques, jamais celles des groupes privés", async () => {
    const priv = await privateGroupIds(anon);
    const { data, error } = await anon.from("posts").select("id, visibility, group_id, page_id").limit(1000);
    expect(error).toBeNull();
    for (const p of data ?? []) {
      expect(p.visibility === "public" || p.page_id !== null || p.group_id !== null).toBe(true);
      if (p.group_id) expect(priv.has(p.group_id)).toBe(false);
    }
  });

  it("ne peut rien créer", async () => {
    const post = await anon.from("posts").insert({ user_id: FAKE, caption: "test" });
    const group = await anon.from("groups").insert({ owner_id: FAKE, slug: "x-test", name: "x" });
    const msg = await anon.from("messages").insert({ conversation_id: FAKE, sender_id: FAKE, kind: "text", content: "x" });
    expect(post.error).not.toBeNull();
    expect(group.error).not.toBeNull();
    expect(msg.error).not.toBeNull();
  });

  it("ne peut pas utiliser les vérifications d'admin", async () => {
    const r = await anon.rpc("is_page_admin", { _page_id: FAKE, _user_id: FAKE });
    expect(r.error).not.toBeNull();
  });
});

describe.skipIf(!TOKEN || !USER_ID)("Membre connecté", () => {
  const me = client(TOKEN);
  const uid = USER_ID!;

  it("ne voit que ses propres conversations", async () => {
    const { data, error } = await me.from("conversations").select("id, user_a, user_b");
    expect(error).toBeNull();
    for (const c of data ?? []) expect([c.user_a, c.user_b]).toContain(uid);
  });

  it("ne voit que les messages de ses conversations", async () => {
    const { data: convs } = await me.from("conversations").select("id");
    const mine = new Set((convs ?? []).map((c) => c.id));
    const { data } = await me.from("messages").select("conversation_id").limit(1000);
    for (const m of data ?? []) expect(mine.has(m.conversation_id)).toBe(true);
  });

  it("ne voit les publications « amis » que de ses amis, et pas les groupes privés dont il n'est pas membre", async () => {
    const priv = await privateGroupIds(me);
    const { data: posts } = await me.from("posts").select("id, user_id, visibility, group_id").limit(1000);
    for (const p of posts ?? []) {
      if (p.group_id && priv.has(p.group_id)) {
        const { data: member } = await me.rpc("is_group_member", { _group_id: p.group_id, _user_id: uid });
        expect(member).toBe(true);
      }
      if (p.visibility === "friends" && p.user_id !== uid && !p.group_id) {
        const { data: friends } = await me.rpc("are_friends", { _a: p.user_id, _b: uid });
        expect(friends).toBe(true);
      }
    }
  });

  it("ne peut pas publier au nom d'un autre", async () => {
    const r = await me.from("posts").insert({ user_id: FAKE, caption: "usurpation" });
    expect(r.error).not.toBeNull();
  });

  it("ne peut pas écrire dans la conversation d'autres membres", async () => {
    const r = await me.from("messages").insert({ conversation_id: FAKE, sender_id: uid, kind: "text", content: "x" });
    expect(r.error).not.toBeNull();
  });

  it("ne peut ni modifier ni supprimer la publication d'un autre", async () => {
    const { data } = await me.from("posts").select("id").neq("user_id", uid).limit(1);
    const other = data?.[0];
    if (!other) return;
    const up = await me.from("posts").update({ caption: "piraté" }).eq("id", other.id).select("id");
    const del = await me.from("posts").delete().eq("id", other.id).select("id");
    expect(up.data ?? []).toHaveLength(0);
    expect(del.data ?? []).toHaveLength(0);
  });

  it("ne peut pas se nommer admin d'un groupe", async () => {
    const { data } = await me.from("group_members").select("group_id, role").eq("user_id", uid).neq("role", "admin").limit(1);
    const row = data?.[0];
    if (!row) return;
    const { data: isAdmin } = await me.rpc("is_group_admin", { _group_id: row.group_id, _user_id: uid });
    if (isAdmin) return;
    const r = await me.from("group_members").update({ role: "admin" }).eq("group_id", row.group_id).eq("user_id", uid).select("role");
    expect(r.data ?? []).toHaveLength(0);
  });
});

describe("profils — données personnelles", () => {
  it("un visiteur non connecté ne peut pas lire téléphone, e-mail ni date de naissance", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const c = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { error } = await c.from("profiles").select("phone, contact_email, birthdate").limit(1);
    expect(error).not.toBeNull();
    const ok = await c.from("profiles").select("username, avatar_url").limit(1);
    expect(ok.error).toBeNull();
  });
});
