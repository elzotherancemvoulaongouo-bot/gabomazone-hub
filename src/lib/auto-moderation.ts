import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Algo 2 — Modération automatique.
 * Le score (0-100) est calculé dans la base à chaque publication, commentaire
 * et message (mots interdits, liens, rafales, doublons, majuscules, récidive).
 * ≥ seuil haut → masqué + notification ; seuil moyen → file de validation.
 * Chaque décision est enregistrée dans moderation_auto_log avec ses raisons.
 */
export type AutoModEntry = {
  id: string;
  target_type: "post" | "comment" | "message";
  target_id: string;
  user_id: string;
  excerpt: string | null;
  score: number;
  reasons: string[];
  decision: "hidden" | "queued";
  status: "pending" | "approved" | "rejected" | "restored" | "appealed";
  appeal_text: string | null;
  created_at: string;
};

/** Modérateur : tout le journal. Membre : uniquement ses propres entrées (RLS). */
export function useAutoModLog(enabled = true) {
  return useQuery({
    queryKey: ["auto-mod-log"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_auto_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AutoModEntry[];
    },
  });
}

export async function reviewAutoMod(id: string, action: "approve" | "reject" | "restore") {
  const { error } = await supabase.rpc("moderation_review" as never, {
    _log_id: id,
    _action: action,
  } as never);
  if (error) throw error;
}

export async function appealAutoMod(id: string, text: string) {
  const { error } = await supabase.rpc("moderation_appeal" as never, {
    _log_id: id,
    _text: text,
  } as never);
  if (error) throw error;
}
