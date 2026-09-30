import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchPost } from "@/lib/posts";
import { fetchRecommendations } from "@/lib/discovery";
import { WatchSlide } from "@/components/WatchSlide";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/watch/$postId")({
  head: () => ({ meta: [
    { title: "Lecture vidéo — Gabomazone" },
    { name: "description", content: "Regardez les vidéos et photos de la communauté Gabomazone en plein écran." },
    { property: "og:title", content: "Lecture vidéo — Gabomazone" },
    { property: "og:description", content: "Vidéos et photos en lecture continue sur Gabomazone." },
    { property: "og:type", content: "video.other" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: WatchPage,
});

function WatchPage() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const scroll = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(postId);
  const { data: current, isPending } = useQuery({ queryKey: ["post", postId], queryFn: () => fetchPost(postId) });
  const { data: recommended } = useQuery({ queryKey: ["explore-recommendations", user.id], queryFn: () => fetchRecommendations(user.id) });
  const posts = useMemo(() => current ? [current, ...(recommended ?? []).filter((post) => post.id !== current.id && Boolean(post.media_url || post.media?.length))] : [], [current, recommended]);
  useEffect(() => { setActiveId(postId); scroll.current?.scrollTo({ top: 0 }); }, [postId]);
  useEffect(() => {
    const container = scroll.current;
    if (!container || posts.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= 0.6) setActiveId(entry.target.getAttribute("data-watch-slide") ?? postId);
    }, { root: container, threshold: [0.6] });
    container.querySelectorAll("[data-watch-slide]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [posts, postId]);
  return <div className="relative -mx-3 -my-4 sm:-mx-4">
    <h1 className="sr-only">Lecture continue</h1>
    <div ref={scroll} aria-label="Publications à faire défiler" className="h-[calc(100dvh-8.5rem)] min-h-[320px] w-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth bg-foreground sm:h-[calc(100dvh-8.5rem)]">
      {isPending ? <Skeleton className="size-full" /> : !current ? <div className="flex size-full items-center justify-center bg-background">Publication introuvable.</div> : posts.map((post) => <WatchSlide key={post.id} post={post} userId={user.id} active={activeId === post.id} />)}
    </div>
    <Button size="icon" variant="secondary" aria-label="Revenir en arrière" className="absolute left-3 top-3 z-20 rounded-full" onClick={() => { if (window.history.length > 1) window.history.back(); else navigate({ to: "/explore", search: { q: "" } }); }}><ArrowLeft className="size-5" /></Button>
  </div>;
}
