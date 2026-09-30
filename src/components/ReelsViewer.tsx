import { buildShareUrl, shareContent } from "@/lib/share";
import { claimPlayback, playWithSound, useSound } from "@/lib/sound";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/Avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl, timeAgo } from "@/lib/media";
import { usePostActions, useSavedPostIds } from "@/lib/social";
import type { FeedPost } from "@/components/PostCard";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author: { username: string; avatar_url: string | null } | null;
};

export function ReelsViewer({
  posts,
  initialId,
  userId,
}: {
  posts: FeedPost[];
  initialId: string;
  userId: string;
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(initialId);
  const [commentsId, setCommentsId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const { data: savedIds } = useSavedPostIds(userId);
  const { toggleSave } = usePostActions(userId);
  const { data: followingIds } = useQuery({
    queryKey: ["following-ids", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (error) throw error;
      return (data ?? []).map((row) => row.following_id);
    },
  });
  const follow = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: userId, following_id: creatorId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["following-ids", userId] }),
    onError: () => toast.error("Impossible de s’abonner pour le moment"),
  });
  const { data: comments } = useQuery({
    queryKey: ["comments", commentsId],
    enabled: Boolean(commentsId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          "id, content, created_at, author:profiles!comments_author_profile_fkey(username, avatar_url)",
        )
        .eq("post_id", commentsId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });
  const addComment = useMutation({
    mutationFn: async () => {
      if (!commentsId || !text.trim()) return;
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: commentsId, user_id: userId, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", commentsId] });
      queryClient.invalidateQueries({ queryKey: ["reels-posts"] });
    },
    onError: () => toast.error("Commentaire non envoyé"),
  });

  useEffect(() => {
    const container = scrollRef.current;
    const target = Array.from(container?.children ?? []).find(
      (child) => child.getAttribute("data-post-id") === initialId,
    );
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [initialId, posts]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let frame = 0;
    const updateActive = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const center = container.getBoundingClientRect().top + container.clientHeight / 2;
        const visible = Array.from(container.children).find((child) => {
          const bounds = child.getBoundingClientRect();
          return bounds.top <= center && bounds.bottom > center;
        });
        const id = visible?.getAttribute("data-post-id");
        if (id) setActiveId(id);
      });
    };
    container.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
    return () => {
      container.removeEventListener("scroll", updateActive);
      cancelAnimationFrame(frame);
    };
  }, [posts]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 bg-foreground text-background"
      aria-label="Vidéos en défilement"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button
          size="icon"
          variant="ghost"
          className="pointer-events-auto text-background hover:bg-background/20 hover:text-background"
          aria-label="Quitter les vidéos"
          onClick={() => navigate({ to: "/videos" })}
        >
          <ArrowLeft className="size-6" />
        </Button>
        <span className="font-display text-lg font-semibold">Vidéos</span>
        <span className="size-9" />
      </div>
      <div
        ref={scrollRef}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => (
          <section
            key={post.id}
            data-post-id={post.id}
            className="relative h-dvh w-full snap-start snap-always overflow-hidden"
            aria-label={`Vidéo de ${post.author?.display_name || post.author?.username || "la communauté"}`}
          >
            <Reel
              post={post}
              userId={userId}
              active={activeId === post.id && !commentsId}
              saved={(savedIds ?? []).includes(post.id)}
              following={(followingIds ?? []).includes(post.user_id)}
              followPending={follow.isPending}
              onFollow={() => follow.mutate(post.user_id)}
              onSave={() =>
                toggleSave.mutate({ postId: post.id, saved: (savedIds ?? []).includes(post.id) })
              }
              onComments={() => setCommentsId(post.id)}
            />
          </section>
        ))}
      </div>
      <Sheet
        open={Boolean(commentsId)}
        onOpenChange={(open) => {
          if (!open) setCommentsId(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="z-50 mx-auto flex h-[min(72dvh,650px)] max-w-2xl flex-col rounded-t-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Commentaires</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <UserAvatar
                  avatarPath={comment.author?.avatar_url}
                  name={comment.author?.username}
                  className="size-8"
                />
                <div className="min-w-0 text-sm">
                  <span className="font-semibold">{comment.author?.username}</span>
                  <p className="break-words">{comment.content}</p>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {comments?.length === 0 && (
              <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) addComment.mutate();
            }}
          >
            <Input
              aria-label="Ajouter un commentaire"
              placeholder="Ajouter un commentaire…"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <Button type="submit" disabled={!text.trim() || addComment.isPending}>
              Envoyer
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Reel({
  post,
  userId,
  active,
  saved,
  following,
  followPending,
  onFollow,
  onSave,
  onComments,
}: {
  post: FeedPost;
  userId: string;
  active: boolean;
  saved: boolean;
  following: boolean;
  followPending: boolean;
  onFollow: () => void;
  onSave: () => void;
  onComments: () => void;
}) {
  const path = post.media?.find((item) => item.media_type === "video")?.path ?? post.media_url;
  const { data: src, isError: urlError } = useSignedUrl(active ? path : null);
  const video = useRef<HTMLVideoElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const { muted, toggle: toggleMute } = useSound();
  const [mediaError, setMediaError] = useState(false);
  const [likeOverride, setLikeOverride] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const liked = likeOverride ?? post.likes.some((like) => like.user_id === userId);
  const count =
    post.likes.length +
    (likeOverride === null || likeOverride === post.likes.some((like) => like.user_id === userId)
      ? 0
      : likeOverride
        ? 1
        : -1);
  const like = useMutation({
    mutationFn: async (next: boolean) => {
      const query = next
        ? supabase.from("likes").insert({ post_id: post.id, user_id: userId })
        : supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", userId);
      const { error } = await query;
      if (error) throw error;
    },
    onMutate: (next) => setLikeOverride(next),
    onError: () => {
      setLikeOverride(null);
      toast.error("Action impossible");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reels-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!active || paused) {
      element.pause();
      return;
    }
    claimPlayback(element);
    void playWithSound(element);
  }, [active, paused, src]);
  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    setMediaError(false);
  }, [path]);

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  const playPause = () => setPaused((value) => !value);
  const videoClick = (detail: number) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (detail >= 2) {
      clickTimer.current = null;
      if (!liked && !like.isPending) like.mutate(true);
      return;
    }
    clickTimer.current = setTimeout(() => {
      playPause();
      clickTimer.current = null;
    }, 250);
  };
  const profile = post.author?.username ?? "";
  function share() {
    void shareContent({
      title: "Gabomazone",
      text: post.caption ?? "",
      url: buildShareUrl("watch", post.id),
    });
  }

  return (
    <>
      {active && src && !mediaError ? (
        <video
          ref={video}
          src={src}
          loop
          data-app-video
          playsInline
          preload="auto"
          onError={() => setMediaError(true)}
          onClick={(event) => videoClick(event.detail)}
          className="absolute inset-0 size-full object-contain"
          aria-label="Lire ou mettre en pause la vidéo"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <Play className="size-10" />
          <p className="text-sm">
            {mediaError || urlError
              ? "Cette vidéo ne peut pas être lue sur cet appareil."
              : "Chargement de la vidéo…"}
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-foreground/80 to-transparent" />
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 right-20 z-10 min-w-0 space-y-2 text-background">
        {profile ? (
          <Link
            to="/u/$username"
            params={{ username: profile }}
            className="block truncate font-semibold"
          >
            {post.author?.display_name || profile}
          </Link>
        ) : (
          <span className="block truncate font-semibold">Créateur</span>
        )}
        {post.caption && <p className="line-clamp-3 break-words text-sm">{post.caption}</p>}
        <div className="flex items-center gap-2 text-xs">
          <Music2 className="size-4 shrink-0" />
          <span className="truncate">
            Son original · {post.author?.display_name || profile || "Créateur"}
          </span>
        </div>
      </div>
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-2 z-10 flex w-14 flex-col items-center gap-2 text-background">
        <Button
          variant="ghost"
          size="icon"
          aria-label={liked ? "Je n'aime plus" : "J'aime"}
          onClick={() => like.mutate(!liked)}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          <Heart className={`size-7 ${liked ? "fill-primary text-primary" : ""}`} />
        </Button>
        <span className="text-xs">{count}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Commentaires"
          onClick={onComments}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          <MessageCircle className="size-7" />
        </Button>
        <span className="text-xs">{post.comments[0]?.count ?? 0}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Partager"
          onClick={share}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          <Share2 className="size-7" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={saved ? "Retirer des enregistrements" : "Enregistrer"}
          onClick={onSave}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          <Bookmark className={`size-7 ${saved ? "fill-primary text-primary" : ""}`} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Options de la vidéo"
              className="text-background hover:bg-background/20 hover:text-background"
            >
              <MoreHorizontal className="size-7" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/p/$postId" params={{ postId: post.id }}>
                Voir la publication
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={share}>Partager le lien</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {profile && (
          <div className="relative mt-1 mb-2">
            <Link
              to="/u/$username"
              params={{ username: profile }}
              aria-label={`Voir le profil de ${post.author?.display_name || profile}`}
            >
              <UserAvatar
                avatarPath={post.author?.avatar_url}
                name={profile}
                className="size-11 ring-2 ring-background"
              />
            </Link>
            {post.user_id !== userId && !following && (
              <Button
                size="icon"
                aria-label={`S’abonner à ${post.author?.display_name || profile}`}
                title="S’abonner"
                disabled={followPending}
                onClick={onFollow}
                className="absolute -bottom-2 left-1/2 size-6 -translate-x-1/2 rounded-full border-2 border-foreground p-0"
              >
                <Plus className="size-4" />
              </Button>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={muted ? "Activer le son" : "Couper le son"}
          onClick={toggleMute}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          {muted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={paused ? "Lire la vidéo" : "Mettre en pause"}
          onClick={playPause}
          className="text-background hover:bg-background/20 hover:text-background"
        >
          {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
        </Button>
      </div>
    </>
  );
}
