import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { Media } from "@/components/Media";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explorer — Gabomazone" },
      {
        name: "description",
        content: "Explorez une grille de photos et vidéos publiées par la communauté Gabomazone.",
      },
      { property: "og:title", content: "Explorer — Gabomazone" },
      { property: "og:description", content: "Une grille de découvertes visuelles sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : "",
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q } = Route.useSearch();
  const { data, isPending } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });

  const { data: people } = useQuery({
    queryKey: ["search-people", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const term = `%${q.trim()}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.${term},display_name.ilike.${term}`)
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const term = q.trim().toLowerCase();
  const posts = term
    ? (data ?? []).filter((p) => (p.caption ?? "").toLowerCase().includes(term))
    : (data ?? []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">
        {term ? `Résultats pour « ${q} »` : "Explorer"}
      </h1>

      {people && people.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Personnes</h2>
          <div className="space-y-1">
            {people.map((person) => (
              <Link
                key={person.id}
                to="/u/$username"
                params={{ username: person.username }}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
              >
                <UserAvatar avatarPath={person.avatar_url} name={person.username} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {person.display_name || person.username}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-3 gap-1">
        {isPending
          ? Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md" />
            ))
          : posts.map((post) => (
              <Link
                key={post.id}
                to="/p/$postId"
                params={{ postId: post.id }}
                className="aspect-square overflow-hidden rounded-md"
              >
                <Media
                  path={post.media_url}
                  type={post.media_type}
                  alt={post.caption ?? "Publication"}
                  fallbackText={post.caption}
                  className="size-full object-cover"
                />
              </Link>
            ))}
      </div>
    </div>
  );
}