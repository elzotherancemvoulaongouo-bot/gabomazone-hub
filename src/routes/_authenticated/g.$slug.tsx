import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/Avatar";
import { CommunityCover } from "@/components/CommunityCover";
import { PostCard } from "@/components/PostCard";
import { CommunityComposer } from "@/components/CommunityComposer";
import { fetchGroupBySlug, fetchGroupMembers, joinGroup, leaveGroup } from "@/lib/communities";
import { fetchGroupPosts } from "@/lib/posts";

export const Route = createFileRoute("/_authenticated/g/$slug")({
  head: () => ({
    meta: [
      { title: "Groupe — Gabomazone" },
      { name: "description", content: "Rejoignez ce groupe et suivez ses discussions sur Gabomazone." },
      { property: "og:title", content: "Groupe — Gabomazone" },
      { property: "og:description", content: "Un groupe de la communauté Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupDetail,
});

function GroupDetail() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: group, isPending } = useQuery({ queryKey: ["group", slug], queryFn: () => fetchGroupBySlug(slug) });
  const members = useQuery({
    queryKey: ["group-members", group?.id],
    queryFn: () => fetchGroupMembers(group!.id),
    enabled: Boolean(group),
  });
  const posts = useQuery({
    queryKey: ["group-posts", group?.id],
    queryFn: () => fetchGroupPosts(group!.id),
    enabled: Boolean(group),
  });
  const me = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membership = (members.data ?? []).find((m) => m.user_id === user.id);
  const isOwner = group?.owner_id === user.id;
  const isMember = isOwner || membership?.status === "approved";
  const isAdmin = isOwner || (membership?.status === "approved" && membership?.role === "admin");
  const approvedCount = (members.data ?? []).filter((m) => m.status === "approved").length;

  const toggleMembership = useMutation({
    mutationFn: () => (membership ? leaveGroup(group!.id, user.id) : joinGroup(group!, user.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!group) return <p className="text-sm text-muted-foreground">Groupe introuvable.</p>;

  return (
    <section className="space-y-5">
      <CommunityCover path={group.cover_url ?? null} />

      <header className="-mt-12 space-y-3 px-1">
        <div className="flex items-end gap-3">
          {group.avatar_url ? (
            <UserAvatar
              avatarPath={group.avatar_url}
              name={group.name}
              className="size-20 ring-4 ring-background"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-secondary ring-4 ring-background">
              {group.is_private ? <Lock className="size-8 text-primary" /> : <Users className="size-8 text-primary" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">{group.name}</h1>
            <p className="text-xs text-muted-foreground">
              {group.category ? `${group.category} · ` : ""}
              {group.is_private ? "Groupe privé" : "Groupe public"} · {approvedCount} membre(s)
            </p>
          </div>
          {isAdmin ? (
            <Button asChild variant="ghost" size="icon" aria-label="Paramètres du groupe">
              <Link to="/group-settings/$slug" params={{ slug: group.slug }}>
                <Settings className="size-5" />
              </Link>
            </Button>
          ) : null}
        </div>

        {isOwner ? null : (
          <Button
            variant={membership ? "secondary" : "default"}
            className="w-full"
            onClick={() => toggleMembership.mutate()}
            disabled={toggleMembership.isPending}
          >
            {membership?.status === "approved"
              ? "Quitter le groupe"
              : membership?.status === "pending"
                ? "Demande en attente — annuler"
                : group.is_private
                  ? "Demander à rejoindre"
                  : "Rejoindre"}
          </Button>
        )}
      </header>

      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="posts">Publications</TabsTrigger>
          <TabsTrigger value="about">À propos</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-5 pt-4">
          {isMember ? (
            <CommunityComposer
              userId={user.id}
              groupId={group.id}
              placeholder={`Publier dans ${group.name}…`}
              communityName={group.name}
              communityAvatar={group.avatar_url}
              memberName={me.data?.display_name ?? me.data?.username ?? null}
              memberAvatar={me.data?.avatar_url ?? null}
              canPostAsCommunity={isAdmin}
            />
          ) : null}

          {group.is_private && !isMember ? (
            <p className="rounded-2xl border border-border/70 brand-surface px-4 py-8 text-center text-sm text-muted-foreground">
              Ce groupe est privé. Rejoignez-le pour voir les publications.
            </p>
          ) : posts.isPending ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (posts.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
          ) : (
            (posts.data ?? []).map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} />)
          )}
        </TabsContent>

        <TabsContent value="about" className="pt-4">
          <div className="space-y-2 rounded-2xl border border-border/70 brand-surface p-4 text-sm">
            {group.description ? <p>{group.description}</p> : <p className="text-muted-foreground">Aucune description.</p>}
            <p className="text-xs text-muted-foreground">
              {group.is_private ? "Groupe privé" : "Groupe public"} · {approvedCount} membre(s)
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
