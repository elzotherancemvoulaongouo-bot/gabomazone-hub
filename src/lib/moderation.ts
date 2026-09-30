import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportTarget = "post" | "comment" | "profile" | "page" | "group";

/** Signale un contenu. Doublons et limite horaire sont refusés par la base. */
export async function reportContent(
  reporterId: string,
  targetType: ReportTarget,
  targetId: string,
  reason: string,
) {
  const { error } = await supabase.from("reports" as never).insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
  } as never);
  if (error) {
    if (error.code === "23505") throw new Error("Vous avez déjà signalé ce contenu.");
    throw new Error(error.message || "Signalement impossible");
  }
}

/** Le rôle est vérifié par la base (lecture de sa propre ligne de rôle). */
export function useIsModerator(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-moderator", userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_moderator" as never, {
        _user_id: userId,
      } as never);
      if (error) return false;
      return Boolean(data);
    },
  });
}
