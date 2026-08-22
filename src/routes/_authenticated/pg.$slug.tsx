import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, MapPin, Phone, Settings, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/Avatar";
import { CommunityCover } from "@/components/CommunityCover";
import { PostCard } from "@/components/PostCard";
import { CommunityComposer } from "@/components/CommunityComposer";
import {
  fetchPageAdmins,
  fetchPageBySlug,
  fetchPageFollowers,
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
    queryFn: () => fetchPageFollowers(page!.id),
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

  const isFollowing = (followers.data ?? []).includes(user.id);
  const isAdmin =
    Boolean(page && (page.owner_id === user.id || (admins.data ?? []).some((a) => a.user_id === user.id)));

  const toggleFollow = useMutation({
    mutationFn: () =>
      isFollowing ? unfollowPage(page!.id, user.id) : followPage(page!.id, user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page-followers", page?.id] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!page) return <p className="text-sm text-muted-foreground">Page introuvable.</p>;

  return (
    <section className="space-y-5">
      <CommunityCover path={page.cover_url ?? null} />

      <header className="-mt-12 space-y-3 px-1">
        <div className="flex items-end gap-3">
          {page.avatar_url ? (
            <UserAvatar
              avatarPath={page.avatar_url}
              name={page.name}
              className="size-20 ring-4 ring-background"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-secondary ring-4 ring-background">
              <Store className="size-8 text-primary" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">{page.name}</h1>
            <p className="text-xs text-muted-foreground">
              {page.category ? `${page.category} · ` : ""}@{page.slug} ·{" "}
              {(followers.data ?? []).length} abonné(s)
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

        <div className="flex gap-2">
          <Button
            variant={isFollowing ? "secondary" : "default"}
            className="flex-1"
            onClick={() => toggleFollow.mutate()}
            disabled={toggleFollow.isPending}
          >
            {isFollowing ? "Abonné" : "S'abonner"}
          </Button>
          {page.contact_email ? (
            <Button asChild variant="secondary" className="flex-1">
              <a href={`mailto:${page.contact_email}`}>Contacter</a>
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs defaultValue="posts">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="posts">Publications</TabsTrigger>
          <TabsTrigger value="about">À propos</TabsTrigger>
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
          ) : (posts.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
          ) : (
            (posts.data ?? []).map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} />)
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
      </Tabs>
    </section>
  );
}
