import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharePreview = {
  title: string;
  description: string;
  image: string | null;
  /** Chemin interne vers le contenu une fois connecté. */
  target: string;
};

const Input = z.object({
  kind: z.enum(["p", "watch", "pg", "g", "u"]),
  id: z.string().min(1).max(200),
});

/**
 * Aperçu public d'un lien partagé. Ne renvoie que des informations déjà publiques
 * (publications publiques, pages, groupes publics, profils) et une image temporaire.
 */
export const getSharePreview = createServerFn({ method: "GET" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }): Promise<SharePreview | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sign = async (value: string | null | undefined) => {
      if (!value) return null;
      if (/^https?:\/\//i.test(value)) return value;
      const [bucket, path] = value.startsWith("covers:")
        ? ["covers", value.slice(7)]
        : ["media", value];
      const { data: s } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      return s?.signedUrl ?? null;
    };

    if (data.kind === "p" || data.kind === "watch") {
      const { data: post } = await supabaseAdmin
        .from("posts")
        .select(
          "id, caption, visibility, group_id, page_id, media_url, media_type, user_id, post_media(path, media_type, position)",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (!post) return null;
      if (post.group_id) {
        const { data: g } = await supabaseAdmin
          .from("groups")
          .select("is_private")
          .eq("id", post.group_id)
          .maybeSingle();
        if (!g || g.is_private) return null;
      } else if (!post.page_id && post.visibility !== "public") return null;
      const { data: author } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", post.user_id)
        .maybeSingle();
      const media = (
        (post.post_media ?? []) as { path: string; media_type: string; position: number }[]
      ).sort((a, b) => a.position - b.position);
      const firstImage =
        media.find((m) => m.media_type !== "video")?.path ??
        (post.media_type !== "video" ? post.media_url : null);
      const name = author?.display_name || author?.username || "Gabomazone";
      return {
        title: `${name} sur Gabomazone`,
        description:
          (post.caption ?? "").slice(0, 200) || "Découvrez cette publication sur Gabomazone.",
        image: await sign(firstImage ?? author?.avatar_url),
        target: data.kind === "watch" ? `/watch/${post.id}` : `/p/${post.id}`,
      };
    }
    if (data.kind === "pg") {
      const { data: page } = await supabaseAdmin
        .from("pages")
        .select("slug, name, description, avatar_url, cover_url")
        .eq("slug", data.id)
        .maybeSingle();
      if (!page) return null;
      return {
        title: `${page.name} — Gabomazone`,
        description: page.description?.slice(0, 200) || "Une page Gabomazone.",
        image: await sign(page.cover_url ?? page.avatar_url),
        target: `/pg/${page.slug}`,
      };
    }
    if (data.kind === "g") {
      const { data: group } = await supabaseAdmin
        .from("groups")
        .select("slug, name, description, avatar_url, cover_url, is_private")
        .eq("slug", data.id)
        .maybeSingle();
      if (!group) return null;
      return {
        title: `${group.name} — Gabomazone`,
        description:
          group.description?.slice(0, 200) ||
          (group.is_private ? "Groupe privé sur Gabomazone." : "Un groupe Gabomazone."),
        image: await sign(group.cover_url ?? group.avatar_url),
        target: `/g/${group.slug}`,
      };
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("username", data.id)
      .maybeSingle();
    if (!profile) return null;
    return {
      title: `${profile.display_name || profile.username} — Gabomazone`,
      description: `Le profil de ${profile.display_name || profile.username} sur Gabomazone.`,
      image: await sign(profile.avatar_url),
      target: `/u/${profile.username}`,
    };
  });
