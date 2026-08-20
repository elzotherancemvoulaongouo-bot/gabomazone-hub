import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadPostMedia } from "@/lib/posts";

export type Story = {
  id: string;
  user_id: string;
  media_path: string | null;
  media_type: string | null;
  caption: string | null;
  background: string | null;
  created_at: string;
  expires_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type StoryGroup = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  stories: Story[];
  hasUnseen: boolean;
};

const STORY_SELECT =
  "id, user_id, media_path, media_type, caption, background, created_at, expires_at";

/** Stories actives (non expirées) visibles par l'utilisateur, groupées par auteur. */
export function useStories(currentUserId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["stories"],
    queryFn: async (): Promise<StoryGroup[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("stories")
        .select(STORY_SELECT)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Omit<Story, "author">[];
      if (rows.length === 0) return [];

      const authorIds = [...new Set(rows.map((r) => r.user_id))];
      const [{ data: profiles }, { data: views }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds),
        supabase
          .from("story_views")
          .select("story_id")
          .eq("user_id", currentUserId)
          .in(
            "story_id",
            rows.map((r) => r.id),
          ),
      ]);
      const seen = new Set((views ?? []).map((v) => v.story_id));
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const groups = new Map<string, StoryGroup>();
      for (const row of rows) {
        const profile = profileById.get(row.user_id);
        const group =
          groups.get(row.user_id) ??
          ({
            userId: row.user_id,
            username: profile?.username ?? "membre",
            displayName: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            stories: [],
            hasUnseen: false,
          } satisfies StoryGroup);
        group.stories.push({
          ...row,
          author: profile
            ? {
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              }
            : null,
        });
        if (!seen.has(row.id) && row.user_id !== currentUserId) group.hasUnseen = true;
        groups.set(row.user_id, group);
      }

      const list = [...groups.values()];
      // Soi d'abord, puis les non vues, puis les plus récentes.
      list.sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
        const aLast = a.stories.at(-1)?.created_at ?? "";
        const bLast = b.stories.at(-1)?.created_at ?? "";
        return bLast.localeCompare(aLast);
      });
      return list;
    },
    staleTime: 1000 * 30,
  });

  // Temps réel : nouvelles stories sans recharger la page.
  useEffect(() => {
    const channel = supabase
      .channel("stories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => void queryClient.invalidateQueries({ queryKey: ["stories"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Purge locale des stories expirées.
  useEffect(() => {
    const timer = window.setInterval(
      () => void queryClient.invalidateQueries({ queryKey: ["stories"] }),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, [queryClient]);

  return query;
}

export async function createStory(input: {
  userId: string;
  file?: File | null;
  caption?: string | null;
  background?: string | null;
}) {
  let mediaPath: string | null = null;
  let mediaType: string | null = null;
  if (input.file) {
    const uploaded = await uploadPostMedia(input.userId, input.file);
    mediaPath = uploaded.path;
    mediaType = uploaded.type;
  }
  const { error } = await supabase.from("stories").insert({
    user_id: input.userId,
    media_path: mediaPath,
    media_type: mediaType,
    caption: input.caption?.trim() ? input.caption.trim() : null,
    background: input.background ?? null,
  });
  if (error) throw error;
}

export function useCreateStory(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file?: File | null; caption?: string | null; background?: string | null }) =>
      createStory({ userId, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

export async function markStorySeen(storyId: string, userId: string) {
  // ON CONFLICT DO NOTHING : ne nécessite que le droit d'insertion.
  await supabase
    .from("story_views")
    .upsert(
      { story_id: storyId, user_id: userId },
      { onConflict: "story_id,user_id", ignoreDuplicates: true },
    );
}

export async function deleteStory(storyId: string) {
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw error;
}
