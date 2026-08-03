import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { fetchFeed } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Fil d'actualité — Gabomazone" },
      {
        name: "description",
        content: "Découvrez les dernières photos et vidéos partagées par la communauté Gabomazone.",
      },
      { property: "og:title", content: "Fil d'actualité — Gabomazone" },
      { property: "og:description", content: "Les derniers moments partagés sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { user } = Route.useRouteContext();
  const { data, isPending } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Fil d'actualité Gabomazone</h1>
      {isPending ? (
        <>
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </>
      ) : data && data.length > 0 ? (
        data.map((post) => <PostCard key={post.id} post={post} currentUserId={user.id} />)
      ) : (
        <div className="rounded-2xl border border-border/70 p-10 text-center brand-surface">
          <Camera className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune publication pour l'instant. Soyez le premier !
          </p>
          <Button asChild className="mt-5">
            <Link to="/create">Publier une photo ou vidéo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}