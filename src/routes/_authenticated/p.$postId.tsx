import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPost } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/p/$postId")({
  head: () => ({
    meta: [
      { title: "Publication — Gabomazone" },
      {
        name: "description",
        content: "Regardez cette publication et rejoignez la conversation sur Gabomazone.",
      },
      { property: "og:title", content: "Publication — Gabomazone" },
      { property: "og:description", content: "Une publication partagée sur Gabomazone." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const postQuery = useQuery({ queryKey: ["post", postId], queryFn: () => fetchPost(postId) });

  const commentsQuery = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          "id, content, created_at, author:profiles!comments_author_profile_fkey(username, display_name, avatar_url)",
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: user.id, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Commentaire non envoyé"),
  });

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Publication Gabomazone</h1>
      {postQuery.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : postQuery.data ? (
        <PostCard post={postQuery.data} currentUserId={user.id} />
      ) : (
        <p className="text-sm text-muted-foreground">Cette publication n'existe plus.</p>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Commentaires</h2>
        {(commentsQuery.data ?? []).map((c) => (
          <div key={c.id} className="flex gap-3">
            <UserAvatar avatarPath={c.author?.avatar_url} name={c.author?.username} />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="mr-2 font-semibold">{c.author?.username}</span>
                {c.content}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))}
        {commentsQuery.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (content.trim()) addComment.mutate();
          }}
        >
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ajouter un commentaire…"
            aria-label="Ajouter un commentaire"
          />
          <Button type="submit" disabled={!content.trim() || addComment.isPending}>
            Envoyer
          </Button>
        </form>
      </section>
    </div>
  );
}