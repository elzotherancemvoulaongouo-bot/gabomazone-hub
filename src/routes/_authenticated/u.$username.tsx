import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProfileByUsername } from "@/lib/posts";
import { ProfileView, type ProfileRow } from "@/components/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Profil — Gabomazone" },
      {
        name: "description",
        content: "Découvrez les publications de ce membre de la communauté Gabomazone.",
      },
      { property: "og:title", content: "Profil — Gabomazone" },
      { property: "og:description", content: "Le profil d'un membre de Gabomazone." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserPage,
});

function UserPage() {
  const { username } = Route.useParams();
  const { data, isPending } = useQuery({
    queryKey: ["profile-username", username],
    queryFn: () => fetchProfileByUsername(username),
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return <p className="text-sm text-muted-foreground">Profil introuvable.</p>;
  return <ProfileView profile={data as ProfileRow} />;
}