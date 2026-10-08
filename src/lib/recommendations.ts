// Algorithme 3 : recommandations calculées côté base (recommend_people / recommend_communities).
// Score personnes = amis en commun × poids + groupes en commun × poids + même ville.
// Score communautés = amis membres × poids + centres d'intérêt (catégories suivies).
// Exclus : bloqués, déjà amis/demandes (acceptées, en attente ou refusées), éléments ignorés.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PersonSuggestion = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  score: number;
  reasons: string[];
};
export type CommunitySuggestion = {
  kind: "group" | "page";
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  category: string | null;
  score: number;
  reasons: string[];
};

export function usePeopleSuggestions(limit = 10) {
  return useQuery({
    queryKey: ["reco", "people", limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recommend_people", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as PersonSuggestion[];
    },
  });
}

export function useCommunitySuggestions(limit = 10) {
  return useQuery({
    queryKey: ["reco", "communities", limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recommend_communities", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as CommunitySuggestion[];
    },
  });
}

export function useDismissSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { type: "user" | "group" | "page"; id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const { error } = await supabase
        .from("recommendation_dismissals")
        .insert({ user_id: auth.user.id, target_type: v.type, target_id: v.id });
      if (error && error.code !== "23505") throw error;
    },
    onMutate: (v) => {
      // Retrait optimiste de toutes les listes de suggestions en cache
      qc.setQueriesData<Array<{ id: string }>>({ queryKey: ["reco"] }, (old) =>
        old?.filter((s) => s.id !== v.id),
      );
    },
  });
}
