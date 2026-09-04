import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserSettings = {
  user_id: string;
  post_visibility: "public" | "friends" | "only_me";
  who_can_message: "everyone" | "friends";
  who_can_friend_request: "everyone" | "friends_of_friends" | "nobody";
  notif_messages: boolean;
  notif_likes: boolean;
  notif_comments: boolean;
  notif_friends: boolean;
  feed_sort: "recent" | "friends_first";
  autoplay_videos: boolean;
  data_saver: boolean;
  language: string;
  theme: "dark" | "light" | "system";
  font_size: "small" | "normal" | "large";
  reduce_motion: boolean;
  high_contrast: boolean;
  friend_list_visibility: "public" | "friends" | "only_me";
  who_can_comment: "everyone" | "friends";
  notif_push: boolean;
  notif_email: boolean;
  notif_mentions: boolean;
  notif_groups: boolean;
  two_factor_enabled: boolean;
  muted_keywords: string[];
  feed_algorithm: "chronological" | "personalized";
};

export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  post_visibility: "public",
  who_can_message: "everyone",
  who_can_friend_request: "everyone",
  notif_messages: true,
  notif_likes: true,
  notif_comments: true,
  notif_friends: true,
  feed_sort: "recent",
  autoplay_videos: true,
  data_saver: false,
  language: "fr",
  theme: "dark",
  font_size: "normal",
  reduce_motion: false,
  high_contrast: false,
  friend_list_visibility: "friends",
  who_can_comment: "everyone",
  notif_push: true,
  notif_email: false,
  notif_mentions: true,
  notif_groups: true,
  two_factor_enabled: false,
  muted_keywords: [],
  feed_algorithm: "chronological",
};

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as UserSettings;
  const { data: created, error: insertError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created as UserSettings;
}

export function useSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-settings", userId],
    queryFn: () => fetchSettings(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}

export function useUpdateSettings(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<UserSettings, "user_id">>) => {
      if (!userId) throw new Error("Non connecté");
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      const key = ["user-settings", userId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserSettings>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["user-settings", userId], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", userId] });
    },
  });
}

/** Applique le thème, la taille de texte et les options d'accessibilité au document. */
export function useApplyAppearance(settings: UserSettings | undefined) {
  const theme = settings?.theme ?? "dark";
  const fontSize = settings?.font_size ?? "normal";
  const reduceMotion = settings?.reduce_motion ?? false;
  const highContrast = settings?.high_contrast ?? false;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prefersLight =
      theme === "light" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: light)").matches);
    root.classList.toggle("theme-light", prefersLight);
    root.classList.remove("font-scale-small", "font-scale-normal", "font-scale-large");
    root.classList.add(`font-scale-${fontSize}`);
    root.classList.toggle("reduce-motion", reduceMotion);
    root.classList.toggle("high-contrast", highContrast);
  }, [theme, fontSize, reduceMotion, highContrast]);
}