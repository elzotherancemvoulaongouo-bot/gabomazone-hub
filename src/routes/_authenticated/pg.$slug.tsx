import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, MapPin, Phone, Settings, Share2, Store, ThumbsUp } from "lucide-react";
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
import {
  fetchPageAdmins,
  fetchPageBySlug,
  fetchPageFollowerProfiles,
  followPage,
  unfollowPage,
} from "@/lib/communities";
import { fetchPagePosts } from "@/lib/posts";

export const Route = createFileRoute("/_authenticated/pg/$slug")({
  head: () => ({
    meta: [
      { title: "Page — Gabomazone" },
      { name: "description", content: "Découvrez cette page et ses publications sur Gabomazone." },
      { property: "og:title", content: "Page — Gabomazone" },
      { property: "og:description", content: "Une page de la communauté Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageDetail,
});

function PageDetail() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: page, isPending } = useQuery({ queryKey: ["page", slug], queryFn: () => fetchPageBySlug(slug) });
  const followers = useQuery({
    queryKey: ["page-followers", page?.id],
    queryFn: () => fetchPageFollowerProfiles(page!.id),
    enabled: Boolean(page),
  });
  const admins = useQuery({
    queryKey: ["page-admins", page?.id],
    queryFn: () => fetchPageAdmins(page!.id),
    enabled: Boolean(page),
  });
  const posts = useQuery({
    queryKey: ["page-posts", page?.id],
    queryFn: () => fetchPagePosts(page!.id),
    enabled: Boolean(page),
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

  const followerList = followers.data ?? [];
  const isFollowing = followerList.some((f) => f.user_id === user.id);
  const isAdmin =
    Boolean(page && (page.owner_id === user.id || (admins.data ?? []).some((a) => a.user_id === user.id)));

  const toggleFollow = useMutation({
    mutationFn: () =>
      isFollowing ? unfollowPage(page!.id, user.id) : followPage(page!.id, user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page-followers", page?.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  async function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/pg/${slug}` : `/pg/${slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: page?.name ?? "Gabomazone", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Lien de la page copié");
    } catch {
      /* partage annulé */
    }
  }

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!page) return <p className="text-sm text-muted-foreground">Page introuvable.</p>;

  const allPosts = posts.data ?? [];
  const photos = allPosts.filter((p) => p.media_url && p.media_type !== "video");
  const videos = allPosts.filter((p) => p.media_type === "video");

  return (
    <section className="space-y-5">
      <CoverPhoto
        path={page.cover_url ?? null}
        editable={isAdmin}
        userId={user.id}
        onSave={async (value) => {
          const { error } = await supabase
            .from("pages")
            .update({ cover_url: value })
            .eq("id", page.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ["page", slug] });
        }}
      />

      <header className="-mt-14 space-y-3 px-1 sm:-mt-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {page.avatar_url ? (
            <UserAvatar
              avatarPath={page.avatar_url}
              name={page.name}
              className="size-24 ring-4 ring-background sm:size-28"
            />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-full bg-secondary ring-4 ring-background sm:size-28">
              <Store className="size-10 text-primary" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold">{page.name}</h1>
            <p className="text-xs text-muted-foreground">
              {page.category ? `${page.category} · ` : ""}@{page.slug} · {followerList.length} abonné(s)
            </p>
          </div>
          {isAdmin ? (
            <Button asChild variant="ghost" size="icon" aria-label="Paramètres de la page">
              <Link to="/page-settings/$slug" params={{ slug: page.slug }}>
                <Settings className="size-5" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={isFollowing ? "secondary" : "default"}
            className="flex-1"
            onClick={() => toggleFollow.mutate()}
            disabled={toggleFollow.isPending}
          >
            <ThumbsUp className="mr-2 size-4" />
            {isFollowing ? "Abonné" : "Suivre"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={share}>
            <Share2 className="mr-2 size-4" /> Partager
          </Button>
          {page.contact_email ? (
            <Button asChild variant="secondary" className="flex-1">
              <a href={`mailto:${page.contact_email}`}>Contacter</a>
            </Button>
          ) : null}
        </div>
      </header>

      {page.description ? <p className="px-1 text-sm leading-relaxed">{page.description}</p> : null}

      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="posts">Publications</TabsTrigger>
          <TabsTrigger value="about">À propos</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="videos">Vidéos</TabsTrigger>
          <TabsTrigger value="followers">Abonnés</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-5 pt-4">
          {isAdmin ? (
            <CommunityComposer
              userId={user.id}
              pageId={page.id}
              placeholder={`Publier sur ${page.name}…`}
              communityName={page.name}
              communityAvatar={page.avatar_url}
              memberName={me.data?.display_name ?? me.data?.username ?? null}
              memberAvatar={me.data?.avatar_url ?? null}
            />
          ) : null}

          {posts.isPending ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : allPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
          ) : (
            allPosts.map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} />)
          )}
        </TabsContent>

        <TabsContent value="about" className="pt-4">
          <div className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4">
            {page.description ? <p className="text-sm">{page.description}</p> : null}
            <ul className="space-y-2 text-xs text-muted-foreground">
              {page.city || page.country ? (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4" /> {[page.city, page.country].filter(Boolean).join(", ")}
                </li>
              ) : null}
              {page.phone ? (
                <li className="flex items-center gap-2">
                  <Phone className="size-4" /> {page.phone}
                </li>
              ) : null}
              {page.contact_email ? (
                <li className="flex items-center gap-2">
                  <Mail className="size-4" /> {page.contact_email}
                </li>
              ) : null}
              {page.website ? (
                <li className="flex items-center gap-2">
                  <Globe className="size-4" /> {page.website}
                </li>
              ) : null}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="photos" className="pt-4">
          <MediaGrid items={photos} empty="Aucune photo." />
        </TabsContent>

        <TabsContent value="videos" className="pt-4">
          <MediaGrid items={videos} empty="Aucune vidéo." />
        </TabsContent>

        <TabsContent value="followers" className="space-y-2 pt-4">
          {followerList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun abonné pour le moment.</p>
          ) : (
            followerList.map((f) => (
              <Link
                key={f.user_id}
                to="/u/$username"
                params={{ username: f.profile?.username ?? "" }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-3"
              >
                <UserAvatar avatarPath={f.profile?.avatar_url ?? null} name={f.profile?.username} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {f.profile?.display_name || f.profile?.username || "Membre"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{f.profile?.username}
                  </span>
                </span>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
