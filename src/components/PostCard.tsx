import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Media } from "@/components/Media";
import { UserAvatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";

export type FeedPost = {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: string | null;
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

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string }) {
  const queryClient = useQueryClient();
  const liked = post.likes.some((l) => l.user_id === currentUserId);
  const likeCount = post.likes.length;
  const commentCount = post.comments[0]?.count ?? 0;

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

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 brand-surface">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to="/u/$username" params={{ username: post.author?.username ?? "" }}>
          <UserAvatar avatarPath={post.author?.avatar_url} name={post.author?.username} />
        </Link>
        <div className="min-w-0">
          <Link
            to="/u/$username"
            params={{ username: post.author?.username ?? "" }}
            className="block truncate text-sm font-semibold"
          >
            {post.author?.display_name || post.author?.username}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {post.location ? `${post.location} · ` : ""}
            {timeAgo(post.created_at)}
          </p>
        </div>
      </header>

      {post.media_url ? (
        <Media
          path={post.media_url}
          type={post.media_type ?? "image"}
          alt={post.caption ?? "Publication"}
          className="aspect-square w-full bg-muted object-cover"
        />
      ) : post.caption ? (
        <p className="px-4 pb-1 text-base leading-relaxed">{post.caption}</p>
      ) : null}

      <div className="flex items-center gap-4 px-4 pt-3">
        <button
          type="button"
          onClick={() => toggleLike.mutate()}
          disabled={toggleLike.isPending}
          aria-label={liked ? "Je n'aime plus" : "J'aime"}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <Heart className={cn("size-6", liked && "fill-primary text-primary")} />
          {likeCount}
        </button>
        <Link
          to="/p/$postId"
          params={{ postId: post.id }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <MessageCircle className="size-6" />
          {commentCount}
        </Link>
      </div>

      {post.caption && post.media_url ? (
        <p className="px-4 py-3 text-sm leading-relaxed">
          <span className="mr-2 font-semibold">{post.author?.username}</span>
          {post.caption}
        </p>
      ) : (
        <div className="pb-3" />
      )}
    </article>
  );
}