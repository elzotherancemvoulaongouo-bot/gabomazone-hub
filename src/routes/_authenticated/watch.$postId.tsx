import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPost } from "@/lib/posts";

// Keep old shared links usable, without restoring a vertical full-screen feed.
export const Route = createFileRoute("/_authenticated/watch/$postId")({
  head: () => ({ meta: [
    { title: "Publication — Gabomazone" },
    { name: "description", content: "Découvrez cette publication photo ou vidéo Gabomazone." },
    { property: "og:title", content: "Publication — Gabomazone" },
    { property: "og:description", content: "Découvrez cette publication photo ou vidéo Gabomazone." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: WatchPost,
});

function WatchPost() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: post, isPending } = useQuery({ queryKey: ["post", postId], queryFn: () => fetchPost(postId) });
  return <div className="space-y-3">
    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/explore", search: { q: "" } })}><ArrowLeft className="mr-2 size-4" />Explorer</Button>
    {isPending ? <Skeleton className="h-72 w-full" /> : post ? <PostCard post={post} currentUserId={user.id} /> : <p className="text-sm text-muted-foreground">Publication introuvable.</p>}
  </div>;
}