import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileView, type ProfileRow } from "@/components/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "Mon profil — Gabomazone" },
      { name: "description", content: "Retrouvez vos publications et votre profil Gabomazone." },
      { property: "og:title", content: "Mon profil — Gabomazone" },
      { property: "og:description", content: "Vos photos et vidéos partagées sur Gabomazone." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MePage,
});

function MePage() {
  const { user } = Route.useRouteContext();
  const { data, isPending } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return <p className="text-sm text-muted-foreground">Profil introuvable.</p>;
  return <ProfileView profile={data} />;
}