import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Settings, Share2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/Avatar";
import { CoverPhoto } from "@/components/CoverPhoto";
import { MediaGrid } from "@/components/MediaGrid";
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
    queryKey: ["profile-brief", user.id],
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
  const approvedMembers = (members.data ?? []).filter((m) => m.status === "approved");
  const approvedCount = approvedMembers.length;

  const toggleMembership = useMutation({
    mutationFn: () => (membership ? leaveGroup(group!.id, user.id) : joinGroup(group!, user.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  async function share(invite = false) {
    const url = typeof window !== "undefined" ? `${window.location.origin}/g/${slug}` : `/g/${slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: group?.name ?? "Gabomazone",
          text: invite ? `Rejoins le groupe ${group?.name} sur Gabomazone` : "",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(invite ? "Lien d'invitation copié" : "Lien du groupe copié");
    } catch {
      /* partage annulé */
    }
  }

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!group) return <p className="text-sm text-muted-foreground">Groupe introuvable.</p>;

  const canSeeContent = isMember || !group.is_private;
  const allPosts = posts.data ?? [];
  const photos = allPosts.filter((p) => p.media_url && p.media_type !== "video");
  const videos = allPosts.filter((p) => p.media_type === "video");

  return (
    <section className="space-y-5">
      <CoverPhoto
        path={group.cover_url ?? null}
        editable={isAdmin}
        userId={user.id}
        onSave={async (value) => {
          const { error } = await supabase
            .from("groups")
            .update({ cover_url: value })
            .eq("id", group.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ["group", slug] });
        }}
      />

      <header className="relative z-10 -mt-12 space-y-3 px-2 sm:-mt-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {group.avatar_url ? (
            <UserAvatar
              avatarPath={group.avatar_url}
              name={group.name}
              className="relative z-10 size-24 shrink-0 rounded-full ring-4 ring-background shadow-md sm:size-28"
            />
          ) : (
            <span className="relative z-10 flex size-24 shrink-0 items-center justify-center rounded-full bg-secondary ring-4 ring-background shadow-md sm:size-28">
              {group.is_private ? <Lock className="size-10 text-primary" /> : <Users className="size-10 text-primary" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold">{group.name}</h1>
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

        <div className="flex flex-wrap gap-2">
          {isOwner ? null : (
            <Button
              variant={membership ? "secondary" : "default"}
              className="flex-1"
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
          <Button variant="secondary" className="flex-1" onClick={() => share(true)}>
            <UserPlus className="mr-2 size-4" /> Inviter
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => share(false)}>
            <Share2 className="mr-2 size-4" /> Partager
          </Button>
        </div>
      </header>

      {group.description ? <p className="px-1 text-sm leading-relaxed">{group.description}</p> : null}

      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="posts">Publications</TabsTrigger>
          <TabsTrigger value="about">À propos</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="videos">Vidéos</TabsTrigger>
          <TabsTrigger value="members">Membres</TabsTrigger>
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

          {!canSeeContent ? (
            <p className="rounded-2xl border border-border/70 brand-surface px-4 py-8 text-center text-sm text-muted-foreground">
              Ce groupe est privé. Rejoignez-le pour voir les publications.
            </p>
          ) : posts.isPending ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : allPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
          ) : (
            allPosts.map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} />)
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

        <TabsContent value="photos" className="pt-4">
          <MediaGrid items={canSeeContent ? photos : []} empty="Aucune photo." />
        </TabsContent>

        <TabsContent value="videos" className="pt-4">
          <MediaGrid items={canSeeContent ? videos : []} empty="Aucune vidéo." />
        </TabsContent>

        <TabsContent value="members" className="space-y-2 pt-4">
          {approvedMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>
          ) : (
            approvedMembers.map((m) => (
              <Link
                key={m.user_id}
                to="/u/$username"
                params={{ username: m.profile?.username ?? "" }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-3"
              >
                <UserAvatar avatarPath={m.profile?.avatar_url ?? null} name={m.profile?.username} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.profile?.display_name || m.profile?.username || "Membre"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{m.profile?.username}
                  </span>
                </span>
                {m.role === "admin" ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    Admin
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
