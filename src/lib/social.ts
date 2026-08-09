import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Publications enregistrées ---------- */
export function useSavedPostIds(userId: string | undefined) {
  return useQuery({
    queryKey: ["saved-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_posts").select("post_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.post_id);
    },
    enabled: Boolean(userId),
  });
}

export function useHiddenPostIds(userId: string | undefined) {
  return useQuery({
    queryKey: ["hidden-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hidden_posts").select("post_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.post_id);
    },
    enabled: Boolean(userId),
  });
}

export function usePostActions(userId: string) {
  const queryClient = useQueryClient();

  const toggleSave = useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (saved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      toast.success(vars.saved ? "Retiré des enregistrements" : "Publication enregistrée");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  const hidePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("hidden_posts").insert({ post_id: postId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-posts"] });
      toast.success("Publication masquée");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  const reportPost = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const { error } = await supabase
        .from("post_reports")
        .insert({ post_id: postId, reporter_id: userId, reason });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Merci, votre signalement a été transmis."),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Signalement impossible"),
  });

  return { toggleSave, hidePost, reportPost };
}

/* ---------- Blocages ---------- */
export function useBlockedUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ["blocked-users", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_id, created_at, profile:profiles!inner(id, username, display_name, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as {
        blocked_id: string;
        created_at: string;
        profile: { id: string; username: string; display_name: string | null; avatar_url: string | null };
      }[];
    },
    enabled: Boolean(userId),
  });
}

export function useBlockActions(userId: string | undefined) {
  const queryClient = useQueryClient();
  const block = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!userId) throw new Error("Non connecté");
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: userId, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Personne bloquée");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Blocage impossible"),
  });

  const unblock = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!userId) throw new Error("Non connecté");
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      toast.success("Déblocage effectué");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Déblocage impossible"),
  });

  return { block, unblock };
}

export function useBlockedIds(userId: string | undefined) {
  return useQuery({
    queryKey: ["blocked-ids", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("blocked_users").select("blocked_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.blocked_id);
    },
    enabled: Boolean(userId),
  });
}