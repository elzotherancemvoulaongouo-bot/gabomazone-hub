import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreTile } from "@/components/ExploreTile";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/videos")({
  head: () => ({ meta: [
    { title: "Vidéos — Gabomazone" },
    { name: "description", content: "Regardez les vidéos publiées sur Gabomazone." },
    { property: "og:title", content: "Vidéos — Gabomazone" },
    { property: "og:description", content: "Les vidéos de la communauté Gabomazone." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: VideosPage,
});

function VideosPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["videos"], queryFn: async () => {
    const { data, error } = await supabase.from("posts").select("id, caption, media_url, media_type, created_at")
      .eq("media_type", "video").order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return data ?? [];
  } });
  return <div className="space-y-4"><h1 className="font-display text-2xl font-bold">Vidéos</h1>
    {isPending ? <Skeleton className="aspect-video w-full" /> : error ? <p className="text-sm text-destructive">Impossible de charger les vidéos.</p> : data?.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{data.map((post) => <ExploreTile key={post.id} post={post} />)}</div> : <p className="py-6 text-sm text-muted-foreground">Aucune vidéo pour le moment.</p>}
  </div>;
}
