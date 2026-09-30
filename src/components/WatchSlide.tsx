import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Plus, Share2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { usePostActions, useSavedPostIds } from "@/lib/social";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FeedPost } from "@/components/PostCard";

type Comment = { id: string; content: string; author: { username: string; avatar_url: string | null } | null };

export function WatchSlide({ post, userId, active }: { post: FeedPost; userId: string; active: boolean }) {
  const queryClient = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);
  const [mutePreference, setMutePreference] = useState<boolean | null>(null);
  const media = post.media?.length ? [...post.media].sort((a,b) => a.position - b.position)[0] : null;
  const path = media?.path ?? post.media_url;
  const type = media?.media_type ?? post.media_type;
  const { data: url } = useSignedUrl(path);
  const liked = post.likes.some((like) => like.user_id === userId);
  const effectiveLiked = likedOverride ?? liked;
  const count = post.likes.length + (likedOverride === null || likedOverride === liked ? 0 : likedOverride ? 1 : -1);
  const { data: savedIds } = useSavedPostIds(userId);
  const saved = savedIds?.includes(post.id) ?? false;
  const { toggleSave, hidePost, reportPost } = usePostActions(userId);
  const { data: follow } = useQuery({ queryKey: ["follow", userId, post.user_id], enabled: post.user_id !== userId, queryFn: async () => {
    const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId).eq("following_id", post.user_id).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } });
  const { data: comments, isPending: commentsPending } = useQuery({ queryKey: ["comments", post.id], enabled: commentsOpen, queryFn: async () => {
    const { data, error } = await supabase.from("comments").select("id, content, author:profiles!comments_author_profile_fkey(username, avatar_url)").eq("post_id", post.id).order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Comment[];
  } });
  const like = useMutation({ mutationFn: async (next: boolean) => {
    const result = next ? await supabase.from("likes").insert({ post_id: post.id, user_id: userId }) : await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", userId);
    if (result.error) throw result.error;
  }, onMutate: setLikedOverride, onError: () => { setLikedOverride(null); toast.error("Action impossible"); }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["post", post.id] }); void queryClient.invalidateQueries({ queryKey: ["explore-recommendations"] }); } });
  const followMutation = useMutation({ mutationFn: async () => {
    const result = follow ? await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", post.user_id) : await supabase.from("follows").insert({ follower_id: userId, following_id: post.user_id });
    if (result.error) throw result.error;
  }, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["follow", userId, post.user_id] }), onError: () => toast.error("Abonnement impossible") });
  const addComment = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: userId, content: draft.trim() });
    if (error) throw error;
  }, onSuccess: () => { setDraft(""); void queryClient.invalidateQueries({ queryKey: ["comments", post.id] }); void queryClient.invalidateQueries({ queryKey: ["post", post.id] }); }, onError: () => toast.error("Commentaire non envoyé") });

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && !commentsOpen && !document.hidden) { el.muted = mutePreference ?? false; el.play().catch(() => { el.muted = true; setMuted(true); void el.play().catch(() => undefined); }); }
    else el.pause();
    const visibility = () => { if (document.hidden) el.pause(); else if (active && !commentsOpen) void el.play().catch(() => undefined); };
    document.addEventListener("visibilitychange", visibility);
    return () => { el.pause(); document.removeEventListener("visibilitychange", visibility); };
  }, [active, commentsOpen, url, mutePreference]);
  async function share() {
    const link = `${window.location.origin}/watch/${post.id}`;
    try { if (navigator.share) await navigator.share({ url: link, text: post.caption ?? "" }); else { await navigator.clipboard.writeText(link); toast.success("Lien copié"); } } catch { /* Cancelled by user. */ }
  }
  if (hidden) return <section className="relative flex h-full snap-start items-center justify-center"><p>Publication masquée</p></section>;
  return <section data-watch-slide={post.id} className="relative h-full w-full snap-start snap-always overflow-hidden bg-foreground text-background" aria-label={`Publication de ${post.author?.display_name || post.author?.username || "Gabomazone"}`}>
    {url && type === "video" ? <video ref={video} src={url} muted={muted} playsInline loop preload={active ? "auto" : "none"} className="absolute inset-0 size-full object-contain" onDoubleClick={() => { if (!effectiveLiked) like.mutate(true); }} onClick={(event) => { if (event.detail === 1 && video.current) { if (video.current.paused) void video.current.play(); else video.current.pause(); } }} /> : url ? <img src={url} alt={post.caption || "Publication"} className="absolute inset-0 size-full object-contain" onDoubleClick={() => { if (!effectiveLiked) like.mutate(true); }} /> : <div className="absolute inset-0 flex items-center justify-center p-10 text-center">{post.caption}</div>}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/95 via-foreground/35 to-transparent" />
    <div className="absolute bottom-16 right-3 z-10 flex flex-col items-center gap-3 sm:right-6">
      <div className="relative mb-2"><Link to="/u/$username" params={{ username: post.author?.username ?? "" }} aria-label="Voir le profil du créateur"><UserAvatar avatarPath={post.author?.avatar_url} name={post.author?.username} className="size-12 ring-background" /></Link>{post.user_id !== userId && !follow && <Button size="icon" aria-label="S’abonner" disabled={followMutation.isPending} onClick={() => followMutation.mutate()} className="absolute -bottom-2 left-1/2 size-5 -translate-x-1/2 rounded-full p-0"><Plus className="size-4" /></Button>}</div>
      <Button variant="ghost" size="icon" aria-label={effectiveLiked ? "Je n’aime plus" : "J’aime"} className="size-11 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 hover:text-background" onClick={() => like.mutate(!effectiveLiked)}><Heart className={`size-7 ${effectiveLiked ? "fill-primary text-primary" : ""}`} /></Button><span className="-mt-3 text-xs font-semibold drop-shadow-md">{count}</span>
      <Button variant="ghost" size="icon" aria-label="Commentaires" className="size-11 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 hover:text-background" onClick={() => setCommentsOpen(true)}><MessageCircle className="size-7" /></Button><span className="-mt-3 text-xs font-semibold drop-shadow-md">{post.comments[0]?.count ?? 0}</span>
      <Button variant="ghost" size="icon" aria-label="Partager" className="size-11 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 hover:text-background" onClick={share}><Share2 className="size-7" /></Button>
      <Button variant="ghost" size="icon" aria-label={saved ? "Retirer des enregistrements" : "Enregistrer"} className="size-11 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 hover:text-background" onClick={() => toggleSave.mutate({ postId: post.id, saved })}><Bookmark className={`size-7 ${saved ? "fill-primary text-primary" : ""}`} /></Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Options" className="size-11 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 hover:text-background"><MoreHorizontal className="size-7" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void share()}>Copier ou partager le lien</DropdownMenuItem>{post.user_id !== userId && <><DropdownMenuItem onSelect={() => { setHidden(true); hidePost.mutate(post.id); }}>Masquer la publication</DropdownMenuItem><DropdownMenuItem onSelect={() => reportPost.mutate({ postId: post.id, reason: "contenu_inapproprie" })}><Flag className="mr-2 size-4" />Signaler</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
    </div>
    <div className="absolute bottom-7 left-4 right-20 z-10 min-w-0 sm:left-6"><Link to="/u/$username" params={{ username: post.author?.username ?? "" }} className="block truncate font-semibold">{post.author?.display_name || post.author?.username || "Gabomazone"}</Link>{post.caption && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{post.caption}</p>}{type === "video" && <Button size="sm" variant="ghost" className="mt-1 -ml-2 text-background hover:bg-background/20 hover:text-background" onClick={() => { const next = !video.current?.muted; setMutePreference(next); setMuted(next); }}>{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} Son {muted ? "désactivé" : "activé"}</Button>}</div>
    <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}><SheetContent side="bottom" className="mx-auto flex h-[min(70dvh,650px)] max-w-2xl flex-col rounded-t-2xl p-4"><SheetTitle>Commentaires</SheetTitle><div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-3">{commentsPending ? <p>Chargement…</p> : comments?.length ? comments.map((comment) => <div key={comment.id} className="flex items-start gap-2"><UserAvatar avatarPath={comment.author?.avatar_url} name={comment.author?.username} className="size-8" /><p className="min-w-0 break-words text-sm"><strong>{comment.author?.username}</strong> {comment.content}</p></div>) : <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>}</div><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) addComment.mutate(); }}><Input aria-label="Ajouter un commentaire" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ajouter un commentaire…" /><Button type="submit" disabled={!draft.trim() || addComment.isPending}>Envoyer</Button></form></SheetContent></Sheet>
  </section>;
}
