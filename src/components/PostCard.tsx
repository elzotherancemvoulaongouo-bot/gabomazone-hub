import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  EyeOff,
  Flag,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PostMediaGallery } from "@/components/PostMediaGallery";
import { UserAvatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";
import { deletePost } from "@/lib/posts";
import { usePostActions, useSavedPostIds } from "@/lib/social";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export type FeedPost = {
  id: string;
  user_id: string;
  page_id?: string | null;
  group_id?: string | null;
  as_community?: boolean | null;

  page?: { name: string; slug: string; avatar_url: string | null } | null;
  group?: { name: string; slug: string; avatar_url?: string | null } | null;
  media_url: string | null;
  media_type: string | null;
  visibility?: string | null;
  media?: { path: string; media_type: string | null; position: number }[] | null;
  caption: string | null;
  location: string | null;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
};

export type PostIdentity = "page" | "group" | "member" | "profile";

/** Identité affichée en tête de publication : Page, Groupe officiel, membre dans un groupe, ou profil. */
export function postIdentity(post: FeedPost): PostIdentity {
  if (post.page) return "page";
  if (post.group) return post.as_community ? "group" : "member";
  return "profile";
}

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const identity = postIdentity(post);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOwner = post.user_id === currentUserId;
  const liked = post.likes.some((l) => l.user_id === currentUserId);
  const likeCount = post.likes.length;
  const commentCount = post.comments[0]?.count ?? 0;
  const { data: savedIds } = useSavedPostIds(currentUserId);
  const saved = (savedIds ?? []).includes(post.id);
  const { toggleSave, hidePost, reportPost } = usePostActions(currentUserId);

  const mediaItems =
    post.media && post.media.length > 0
      ? [...post.media]
          .sort((a, b) => a.position - b.position)
          .map((m) => ({ path: m.path, media_type: m.media_type }))
      : post.media_url
        ? [{ path: post.media_url, media_type: post.media_type }]
        : [];

  const postUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${post.id}` : `/p/${post.id}`;

  async function share() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Gabomazone", text: post.caption ?? "", url: postUrl });
        return;
      }
      await navigator.clipboard.writeText(postUrl);
      toast.success("Lien copié");
    } catch {
      /* partage annulé */
    }
  }

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: currentUserId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: async () => {
      toast.success("Publication supprimée");
      await queryClient.invalidateQueries();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 brand-surface">
      <header className="flex items-center gap-3 px-4 py-3">
        {identity === "page" && post.page ? (
          <Link to="/pg/$slug" params={{ slug: post.page.slug }}>
            <UserAvatar avatarPath={post.page.avatar_url} name={post.page.name} />
          </Link>
        ) : identity === "group" && post.group ? (
          <Link to="/g/$slug" params={{ slug: post.group.slug }}>
            <UserAvatar avatarPath={post.group.avatar_url ?? null} name={post.group.name} />
          </Link>
        ) : (
          <Link to="/u/$username" params={{ username: post.author?.username ?? "" }}>
            <UserAvatar avatarPath={post.author?.avatar_url} name={post.author?.username} />
          </Link>
        )}
        <div className="min-w-0">
          {identity === "page" && post.page ? (
            <Link
              to="/pg/$slug"
              params={{ slug: post.page.slug }}
              className="block truncate text-sm font-semibold"
            >
              {post.page.name}
            </Link>
          ) : identity === "group" && post.group ? (
            <Link
              to="/g/$slug"
              params={{ slug: post.group.slug }}
              className="block truncate text-sm font-semibold"
            >
              {post.group.name}
            </Link>
          ) : (
            <Link
              to="/u/$username"
              params={{ username: post.author?.username ?? "" }}
              className="block truncate text-sm font-semibold"
            >
              {post.author?.display_name || post.author?.username}
            </Link>
          )}
          {identity === "member" && post.group ? (
            <p className="truncate text-xs text-muted-foreground">
              dans{" "}
              <Link
                to="/g/$slug"
                params={{ slug: post.group.slug }}
                className="font-medium text-foreground/80"
              >
                {post.group.name}
              </Link>
            </p>
          ) : null}
          <p className="truncate text-xs text-muted-foreground">
            {identity === "group" && post.group ? (
              <>
                Publication officielle du groupe{" · "}
              </>
            ) : null}
            {post.location ? `${post.location} · ` : ""}
            {timeAgo(post.created_at)}
          </p>
        </div>



        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Options de la publication"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={() => toggleSave.mutate({ postId: post.id, saved })}
              >
                <Bookmark className={cn("mr-2 size-4", saved && "fill-primary text-primary")} />
                {saved ? "Retirer des enregistrements" : "Enregistrer la publication"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await navigator.clipboard.writeText(postUrl);
                  toast.success("Lien copié");
                }}
              >
                <Link2 className="mr-2 size-4" /> Copier le lien
              </DropdownMenuItem>
              {!isOwner ? (
                <>
                  <DropdownMenuItem onSelect={() => hidePost.mutate(post.id)}>
                    <EyeOff className="mr-2 size-4" /> Masquer la publication
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      reportPost.mutate({ postId: post.id, reason: "contenu_inapproprie" })
                    }
                  >
                    <Flag className="mr-2 size-4" /> Signaler
                  </DropdownMenuItem>
                </>
              ) : null}
              {isOwner ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/post-edit/$postId" params={{ postId: post.id }}>
                      <Pencil className="mr-2 size-4" /> Modifier la publication
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" /> Supprimer
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette publication ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est définitive : la publication, ses j'aime et ses commentaires seront
                    supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </header>

      {post.caption ? (
        <p className="px-4 pb-3 text-base leading-relaxed">{post.caption}</p>
      ) : null}

      {mediaItems.length > 0 ? (
        <PostMediaGallery
          items={mediaItems}
          alt={post.caption ?? "Publication"}
          onOpenVideo={() => navigate({ to: "/watch/$postId", params: { postId: post.id } })}
        />
      ) : null}

      <div className="mt-1 grid grid-cols-3 border-t border-border/60 px-1 py-1">
        <button
          type="button"
          onClick={() => toggleLike.mutate()}
          disabled={toggleLike.isPending}
          aria-label={liked ? "Je n'aime plus" : "J'aime"}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <Heart className={cn("size-5", liked && "fill-primary text-primary")} />
          J'aime {likeCount > 0 ? likeCount : ""}
        </button>
        <Link
          to="/p/$postId"
          params={{ postId: post.id }}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <MessageCircle className="size-5" />
          Commenter {commentCount > 0 ? commentCount : ""}
        </Link>
        <button
          type="button"
          onClick={share}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <Share2 className="size-5" /> Partager
        </button>
      </div>
    </article>
  );
}