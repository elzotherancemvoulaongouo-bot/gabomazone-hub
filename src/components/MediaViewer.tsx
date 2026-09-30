import { claimPlayback, playWithSound, useSound } from "@/lib/sound";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Heart, MessageCircle, MoreHorizontal, Pause, Play, Plus, Share2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/Avatar";
import { POST_SELECT } from "@/lib/posts";
import { timeAgo, useSignedUrl } from "@/lib/media";
import { usePostActions, useSavedPostIds } from "@/lib/social";
import type { FeedPost } from "@/components/PostCard";

type Props = { post: FeedPost; posts?: FeedPost[] | undefined; kind: "video" | "image"; index: number; userId: string; onClose: () => void };
type CommentRow = { id: string; content: string; created_at: string; author: { username: string; avatar_url: string | null } | null };
const mediaOf = (post: FeedPost) => post.media?.length ? [...post.media].sort((a, b) => a.position - b.position) : post.media_url ? [{ path: post.media_url, media_type: post.media_type, position: 0 }] : [];
const isVideo = (post: FeedPost) => mediaOf(post).some((media) => media.media_type === "video");

export function MediaViewer({ post, posts, kind, index, userId, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(post.id);
  const [commentsId, setCommentsId] = useState<string | null>(null);
  const [recommendationStarted, setRecommendationStarted] = useState(false);
  const [text, setText] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const queryClient = useQueryClient();
  const { data: savedIds } = useSavedPostIds(userId);
  const { toggleSave } = usePostActions(userId);
  const { data: followingIds } = useQuery({ queryKey: ["following-ids", userId], queryFn: async () => {
    const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    if (error) throw error;
    return (data ?? []).map((row) => row.following_id);
  } });
  const follow = useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: id });
    if (error) throw error;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["following-ids", userId] }), onError: () => toast.error("Abonnement impossible") });
  const { data: recommended } = useQuery({ queryKey: ["viewer-recommended-videos"], enabled: kind === "video" && recommendationStarted, queryFn: async () => {
    const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("visibility", "public").eq("media_type", "video").order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return (data ?? []) as unknown as FeedPost[];
  } });
  const videos = useMemo(() => {
    const source = (posts?.length ? posts : [post]).filter(isVideo);
    const seen = new Set(source.map((item) => item.id));
    const ordered = source.some((item) => item.id === post.id) ? source : [post, ...source];
    seen.add(post.id);
    for (const item of recommended ?? []) if (isVideo(item) && !seen.has(item.id)) { ordered.push(item); seen.add(item.id); }
    return ordered;
  }, [posts, post, recommended]);
  useEffect(() => {
    if (kind !== "video") return;
    const source = (posts?.length ? posts : [post]).filter(isVideo);
    const timer = window.setTimeout(() => setRecommendationStarted(true), source.length > 1 ? 1600 : 0);
    return () => window.clearTimeout(timer);
  }, [kind, posts, post]);
  useEffect(() => {
    if (kind !== "video") return;
    const element = scrollRef.current;
    const position = videos.findIndex((item) => item.id === post.id);
    if (element && position >= 0) element.scrollTop = position * element.clientHeight;
  }, [kind, post.id]);
  useEffect(() => {
    if (kind !== "video") return;
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const center = element.getBoundingClientRect().top + element.clientHeight / 2;
      const visible = Array.from(element.children).find((child) => { const rect = child.getBoundingClientRect(); return rect.top <= center && rect.bottom > center; });
      const id = visible?.getAttribute("data-post-id");
      if (id) setActiveId(id);
    }); };
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { element.removeEventListener("scroll", update); cancelAnimationFrame(frame); };
  }, [kind, videos.length]);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelectorAll("video").forEach((video) => { if (!video.closest('[data-media-viewer="true"]')) video.pause(); });
    const pauseBackground = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLVideoElement && !target.closest('[data-media-viewer="true"]')) target.pause();
    };
    document.addEventListener("play", pauseBackground, true);
    return () => { document.body.style.overflow = old; document.removeEventListener("play", pauseBackground, true); document.querySelectorAll('[data-media-viewer="true"] video').forEach((video) => (video as HTMLVideoElement).pause()); };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { if (commentsId) { event.stopImmediatePropagation(); setCommentsId(null); } else onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, commentsId]);
  const { data: comments } = useQuery({ queryKey: ["comments", commentsId], enabled: Boolean(commentsId), queryFn: async () => {
    const { data, error } = await supabase.from("comments").select("id, content, created_at, author:profiles!comments_author_profile_fkey(username, avatar_url)").eq("post_id", commentsId ?? "").order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as CommentRow[];
  } });
  const addComment = useMutation({ mutationFn: async () => {
    if (!commentsId || !text.trim()) return;
    const { error } = await supabase.from("comments").insert({ post_id: commentsId, user_id: userId, content: text.trim() });
    if (error) throw error;
  }, onSuccess: () => { setText(""); queryClient.invalidateQueries({ queryKey: ["comments", commentsId] }); queryClient.invalidateQueries({ queryKey: ["post", commentsId] }); }, onError: () => toast.error("Commentaire non envoyé") });
  return <div data-media-viewer="true" role="dialog" aria-modal="true" aria-label="Visionneur de médias" className="fixed inset-0 z-[100] bg-viewer text-viewer-foreground">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Button size="icon" variant="ghost" className="pointer-events-auto text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground" aria-label="Fermer le visionneur" onClick={onClose}><ArrowLeft className="size-6" /></Button>
    </div>
    {kind === "video" ? <div ref={scrollRef} onTouchStart={(event) => { touch.current = { x: event.touches[0]?.clientX ?? 0, y: event.touches[0]?.clientY ?? 0 }; }} onTouchEnd={(event) => {
      const point = event.changedTouches[0]; const start = touch.current;
      if (point && start && start.y < 90 && point.clientY - start.y > 130 && Math.abs(point.clientX - start.x) < 100 && scrollRef.current?.scrollTop === 0) onClose();
      touch.current = null;
    }} className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {videos.map((item, position) => <section key={item.id} data-post-id={item.id} className="relative h-dvh w-full snap-start snap-always overflow-hidden">
        <ViewerSlide post={item} kind="video" initialIndex={item.id === post.id ? index : 0} active={activeId === item.id && !commentsId} preload={position <= videos.findIndex((video) => video.id === activeId) + 2 && position >= videos.findIndex((video) => video.id === activeId) - 1} userId={userId} saved={(savedIds ?? []).includes(item.id)} following={(followingIds ?? []).includes(item.user_id)} followPending={follow.isPending} onFollow={() => follow.mutate(item.user_id)} onSave={() => toggleSave.mutate({ postId: item.id, saved: (savedIds ?? []).includes(item.id) })} onComments={() => setCommentsId(item.id)} onClose={onClose} />
      </section>)}
    </div> : <ViewerSlide post={post} kind="image" initialIndex={index} active={!commentsId} preload userId={userId} saved={(savedIds ?? []).includes(post.id)} following={(followingIds ?? []).includes(post.user_id)} followPending={follow.isPending} onFollow={() => follow.mutate(post.user_id)} onSave={() => toggleSave.mutate({ postId: post.id, saved: (savedIds ?? []).includes(post.id) })} onComments={() => setCommentsId(post.id)} onClose={onClose} />}
    <Sheet open={Boolean(commentsId)} onOpenChange={(open) => { if (!open) setCommentsId(null); }}>
      <SheetContent side="bottom" className="z-[110] mx-auto flex h-[min(72dvh,650px)] max-w-2xl flex-col rounded-t-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader><SheetTitle>Commentaires</SheetTitle></SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">{comments?.map((comment) => <div key={comment.id} className="flex gap-2"><UserAvatar avatarPath={comment.author?.avatar_url} name={comment.author?.username} className="size-8" /><div className="min-w-0 text-sm"><span className="font-semibold">{comment.author?.username}</span><p className="break-words">{comment.content}</p><span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span></div></div>)}{comments?.length === 0 && <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>}</div>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (text.trim()) addComment.mutate(); }}><Input aria-label="Ajouter un commentaire" placeholder="Ajouter un commentaire…" value={text} onChange={(event) => setText(event.target.value)} /><Button type="submit" disabled={!text.trim() || addComment.isPending}>Envoyer</Button></form>
      </SheetContent>
    </Sheet>
  </div>;
}

function ViewerSlide({ post, kind, initialIndex, active, preload, userId, saved, following, followPending, onFollow, onSave, onComments, onClose }: {
  post: FeedPost; kind: "image" | "video"; initialIndex: number; active: boolean; preload: boolean; userId: string; saved: boolean; following: boolean; followPending: boolean; onFollow: () => void; onSave: () => void; onComments: () => void; onClose: () => void;
}) {
  const media = mediaOf(post).filter((item) => item.media_type === kind);
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, media.length - 1)));
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const { muted, blocked, toggle: toggleMute } = useSound();
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [likeOverride, setLikeOverride] = useState<boolean | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const imageGesture = useRef<{ x: number; y: number; distance?: number | undefined } | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const current = media[index];
  const { data: src, isError } = useSignedUrl(kind === "video" && active ? current?.path : preload ? current?.path : null);
  const likedFromPost = post.likes.some((like) => like.user_id === userId);
  const liked = likeOverride ?? likedFromPost;
  const count = post.likes.length + (likeOverride === null || likeOverride === likedFromPost ? 0 : likeOverride ? 1 : -1);
  const like = useMutation({ mutationFn: async (next: boolean) => {
    const request = next ? supabase.from("likes").insert({ post_id: post.id, user_id: userId }) : supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", userId);
    const { error } = await request;
    if (error) throw error;
  }, onMutate: setLikeOverride, onError: () => { setLikeOverride(null); toast.error("Action impossible"); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["post", post.id] }); queryClient.invalidateQueries({ queryKey: ["feed"] }); queryClient.invalidateQueries({ queryKey: ["viewer-recommended-videos"] }); } });
  useEffect(() => { const el = video.current; if (!el) return; if (!active || paused) { el.pause(); return; } claimPlayback(el); void playWithSound(el); }, [active, paused, src]);
  useEffect(() => { if (video.current) video.current.muted = muted; }, [muted]);
  const tryPlay = useCallback(() => { const el = video.current; if (el && active && !paused && el.paused) void playWithSound(el); }, [active, paused]);
  useEffect(() => { setMediaError(false); }, [current?.path]);
  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); video.current?.pause(); }, []);
  const changeImage = (next: number) => { if (next >= 0 && next < media.length) { setIndex(next); setZoom(1); setOffset({ x: 0, y: 0 }); } };
  const toggleZoom = () => { setZoom((value) => value > 1 ? 1 : 2); setOffset({ x: 0, y: 0 }); };
  const videoClick = (detail: number) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (detail >= 2) { clickTimer.current = null; if (!liked && !like.isPending) like.mutate(true); return; }
    clickTimer.current = setTimeout(() => { setPaused((value) => !value); clickTimer.current = null; }, 250);
  };
  const share = async () => { const url = `${window.location.origin}/p/${post.id}`; try { if (navigator.share) await navigator.share({ url, text: post.caption ?? "" }); else { await navigator.clipboard.writeText(url); toast.success("Lien copié"); } } catch { /* annulé */ } };
  const profile = post.author?.username ?? "";
  const gestureStart = (event: React.TouchEvent) => {
    const a = event.touches[0], b = event.touches[1]; if (!a) return;
    imageGesture.current = { x: a.clientX, y: a.clientY, distance: b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : undefined };
  };
  const gestureMove = (event: React.TouchEvent) => {
    const start = imageGesture.current, a = event.touches[0], b = event.touches[1]; if (!start || !a) return;
    if (b && start.distance) { setZoom(Math.max(1, Math.min(4, zoom * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / start.distance))); start.distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    else if (zoom > 1) { setOffset((old) => ({ x: old.x + a.clientX - start.x, y: old.y + a.clientY - start.y })); start.x = a.clientX; start.y = a.clientY; }
  };
  const gestureEnd = (event: React.TouchEvent) => {
    const start = imageGesture.current, end = event.changedTouches[0]; imageGesture.current = null;
    if (!start || !end || zoom > 1 || start.distance) return;
    const dx = end.clientX - start.x, dy = end.clientY - start.y;
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) onClose();
    else if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) changeImage(index + (dx < 0 ? 1 : -1));
  };
  return <div className="relative h-dvh w-full overflow-hidden bg-viewer text-viewer-foreground">
    {kind === "video" ? active && src && !mediaError ? <video ref={video} src={src} data-app-video loop playsInline autoPlay preload="auto" onError={() => setMediaError(true)} onClick={(event) => videoClick(event.detail)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onCanPlay={tryPlay} onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)} className="absolute inset-0 size-full object-contain" aria-label="Lire ou mettre en pause la vidéo" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"><Play className="size-10" /><p className="text-sm">{mediaError || isError ? "Cette vidéo ne peut pas être lue sur cet appareil." : "Chargement de la vidéo…"}</p></div>
      : <div className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none" onTouchStart={gestureStart} onTouchMove={gestureMove} onTouchEnd={gestureEnd} onDoubleClick={toggleZoom} onWheel={(event) => { if (event.ctrlKey) { setZoom((value) => Math.max(1, Math.min(4, value - event.deltaY * 0.01))); } }}>
        {src ? <img src={src} alt={post.caption || "Photo"} draggable={false} className="max-h-full max-w-full select-none object-contain" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} /> : <p className="text-sm">{isError ? "Photo indisponible" : "Chargement de la photo…"}</p>}
      </div>}
    {kind === "video" && active && blocked && !paused && <button type="button" onClick={toggleMute} className="absolute left-1/2 top-[max(4rem,env(safe-area-inset-top))] z-20 -translate-x-1/2 rounded-full bg-viewer-foreground/90 px-4 py-2 text-sm font-semibold text-viewer">🔇 Touchez pour activer le son</button>}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-viewer/90 to-transparent" />
    {kind === "image" && media.length > 1 && <><span className="absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-10 -translate-x-1/2 text-sm">{index + 1}/{media.length}</span><Button variant="ghost" size="icon" disabled={index === 0} aria-label="Photo précédente" onClick={() => changeImage(index - 1)} className="absolute left-2 top-1/2 z-10 text-viewer-foreground hover:bg-viewer-foreground/20">‹</Button><Button variant="ghost" size="icon" disabled={index === media.length - 1} aria-label="Photo suivante" onClick={() => changeImage(index + 1)} className="absolute right-2 top-1/2 z-10 text-viewer-foreground hover:bg-viewer-foreground/20">›</Button></>}
    <div className="absolute bottom-[max(3.75rem,env(safe-area-inset-bottom))] left-3 right-20 z-10 min-w-0 space-y-1 text-viewer-foreground sm:left-5">
      {profile ? <Link to="/u/$username" params={{ username: profile }} onClick={onClose} className="block truncate font-semibold">{post.author?.display_name || profile}</Link> : <span className="block truncate font-semibold">Créateur</span>}
      <p className="text-xs opacity-80">{timeAgo(post.created_at)}</p>
      {post.caption && <p className={`${expanded ? "max-h-[25dvh] overflow-y-auto" : "line-clamp-2"} break-words text-sm`}>{post.caption}</p>}
      {post.caption && post.caption.length > 90 && <Button variant="link" size="sm" className="h-auto p-0 text-viewer-foreground underline" onClick={() => setExpanded(!expanded)}>{expanded ? "Voir moins" : "Voir plus"}</Button>}
    </div>
    <div className="absolute bottom-[max(3.75rem,env(safe-area-inset-bottom))] right-2 z-10 flex w-12 flex-col items-center gap-0.5 text-viewer-foreground">
      <Button variant="ghost" size="icon" aria-label={liked ? "Je n'aime plus" : "J'aime"} onClick={() => like.mutate(!liked)} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground"><Heart className={`size-6 ${liked ? "fill-primary text-primary" : ""}`} /></Button><span className="text-xs">{count}</span>
      <Button variant="ghost" size="icon" aria-label="Commentaires" onClick={onComments} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground"><MessageCircle className="size-6" /></Button><span className="text-xs">{post.comments[0]?.count ?? 0}</span>
      <Button variant="ghost" size="icon" aria-label="Partager" onClick={share} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground"><Share2 className="size-6" /></Button>
      <Button variant="ghost" size="icon" aria-label={saved ? "Retirer des enregistrements" : "Enregistrer"} onClick={onSave} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground"><Bookmark className={`size-6 ${saved ? "fill-primary text-primary" : ""}`} /></Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Options du média" className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground"><MoreHorizontal className="size-6" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/p/$postId" params={{ postId: post.id }} onClick={onClose}>Voir la publication</Link></DropdownMenuItem><DropdownMenuItem onSelect={share}>Partager le lien</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      {profile && <div className="relative my-2"><Link to="/u/$username" params={{ username: profile }} onClick={onClose} aria-label={`Voir le profil de ${profile}`}><UserAvatar avatarPath={post.author?.avatar_url} name={profile} className="size-10 ring-2 ring-viewer-foreground" /></Link>{post.user_id !== userId && !following && <Button size="icon" aria-label={`S’abonner à ${profile}`} disabled={followPending} onClick={onFollow} className="absolute -bottom-2 left-1/2 size-6 -translate-x-1/2 rounded-full p-0"><Plus className="size-4" /></Button>}</div>}
      {kind === "video" && <Button variant="ghost" size="icon" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={toggleMute} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground">{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</Button>}
      {kind === "video" && <Button variant="ghost" size="icon" aria-label={paused ? "Lire la vidéo" : "Mettre en pause"} onClick={() => setPaused(!paused)} className="text-viewer-foreground hover:bg-viewer-foreground/20 hover:text-viewer-foreground">{paused ? <Play className="size-5" /> : <Pause className="size-5" />}</Button>}
    </div>
    {kind === "video" && <input type="range" min={0} max={duration || 1} step={0.1} value={progress} onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value); setProgress(Number(event.target.value)); }} aria-label="Progression de la vidéo" className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-10 h-2 w-[calc(100%-1.5rem)] accent-primary" />}
  </div>;
}