import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AlgorithmSetting = {
  key: string;
  enabled: boolean;
  weights: Record<string, number>;
  updated_at: string;
};

export async function fetchAlgorithmSettings() {
  const { data, error } = await supabase.from("algorithm_settings").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as unknown as AlgorithmSetting[];
}

export function useAlgorithmSettings() {
  return useQuery({ queryKey: ["algorithm-settings"], queryFn: fetchAlgorithmSettings });
}

export async function updateAlgorithmSetting(
  key: string,
  values: { enabled?: boolean; weights?: Record<string, number> },
) {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("algorithm_settings")
    .update({ ...values, updated_by: session.session?.user.id ?? null })
    .eq("key", key);
  if (error) throw error;
}
