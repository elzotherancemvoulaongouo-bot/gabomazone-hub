import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReelsViewer } from "@/components/ReelsViewer";
import type { FeedPost } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { POST_SELECT, fetchPost } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/watch/$postId")({
  head: () => ({
    meta: [
      { title: "Vidéos en défilement — Gabomazone" },
      {
        name: "description",
        content: "Regardez les vidéos de la communauté Gabomazone en défilement vertical.",
      },
      { property: "og:title", content: "Vidéos en défilement — Gabomazone" },
      { property: "og:description", content: "Les vidéos de la communauté Gabomazone." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPost,
});

function WatchPost() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data, isPending, error } = useQuery({
    queryKey: ["reels-posts", postId],
    queryFn: async () => {
      const [selected, list] = await Promise.all([
        fetchPost(postId),
        supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("visibility", "public")
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(60),
      ]);
      if (list.error) throw list.error;
      const videos = (list.data ?? []) as unknown as FeedPost[];
      if (selected?.media_type === "video" && !videos.some((post) => post.id === selected.id))
        videos.unshift(selected);
      return selected?.media_type === "video" ? videos : [];
    },
  });
  if (isPending) return <Skeleton className="h-[70dvh] w-full" />;
  if (error) return <p className="text-destructive">Impossible de charger les vidéos.</p>;
  if (!data?.length) return <p className="text-muted-foreground">Vidéo introuvable.</p>;
  return <ReelsViewer posts={data} initialId={postId} userId={user.id} />;
}
