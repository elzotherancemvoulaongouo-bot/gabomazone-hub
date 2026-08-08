import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  const me = (members.data ?? []).find((m) => m.user_id === user.id);
  const isOwner = group?.owner_id === user.id;
  const isMember = isOwner || me?.status === "approved";
  const isAdmin = isOwner || (me?.status === "approved" && me?.role === "admin");
  const approvedCount = (members.data ?? []).filter((m) => m.status === "approved").length;

  const toggleMembership = useMutation({
    mutationFn: () => (me ? leaveGroup(group!.id, user.id) : joinGroup(group!, user.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!group) return <p className="text-sm text-muted-foreground">Groupe introuvable.</p>;

  return (
    <section className="space-y-5">
      <header className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
            {group.is_private ? <Lock className="size-6 text-primary" /> : <Users className="size-6 text-primary" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">{group.name}</h1>
            <p className="text-xs text-muted-foreground">
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

        {group.description ? <p className="text-sm">{group.description}</p> : null}

        {isOwner ? null : (
          <Button
            variant={me ? "secondary" : "default"}
            className="w-full"
            onClick={() => toggleMembership.mutate()}
            disabled={toggleMembership.isPending}
          >
            {me?.status === "approved"
              ? "Quitter le groupe"
              : me?.status === "pending"
                ? "Demande en attente — annuler"
                : group.is_private
                  ? "Demander à rejoindre"
                  : "Rejoindre"}
          </Button>
        )}
      </header>

      {isMember ? (
        <CommunityComposer userId={user.id} groupId={group.id} placeholder={`Publier dans ${group.name}…`} />
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
        <div className="space-y-5">
          {(posts.data ?? []).map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user.id} />
          ))}
        </div>
      )}
    </section>
  );
}
