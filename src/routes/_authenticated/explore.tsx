import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchRecommendations } from "@/lib/discovery";
import { ExploreTile } from "@/components/ExploreTile";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({ meta: [
    { title: "Explorer et rechercher — Gabomazone" },
    { name: "description", content: "Recherchez des personnes, groupes, pages et publications sur Gabomazone." },
    { property: "og:title", content: "Explorer et rechercher — Gabomazone" },
    { property: "og:description", content: "Découvrez les personnes, groupes, pages et publications Gabomazone." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search['q'] === "string" ? search['q'] as string : "" }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const [filter, setFilter] = useState("Pour vous");
  const [tab, setTab] = useState("all");
  const term = q.trim();
  const matching = `%${term.replace(/[%,()]/g, "")}%`;
  const { data: discoveries, isPending: loadingPosts } = useQuery({ queryKey: ["explore-recommendations", user.id], enabled: !term, queryFn: () => fetchRecommendations(user.id) });
  const { data: searchedPosts, isPending: searchingPosts } = useQuery({
    queryKey: ["search-posts", term], enabled: term.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("id, caption, media_url, media_type, created_at")
        .ilike("caption", matching).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: people, isPending: loadingPeople } = useQuery({
    queryKey: ["search-people", term], enabled: term.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.${matching},display_name.ilike.${matching}`).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: groups, isPending: loadingGroups } = useQuery({ queryKey: ["search-groups", term], queryFn: async () => {
    const { data, error } = await supabase.from("groups").select("id, slug, name, avatar_url").ilike("name", matching).limit(30);
    if (error) throw error;
    return data ?? [];
  }, enabled: term.length > 0 });
  const { data: pages, isPending: loadingPages } = useQuery({ queryKey: ["search-pages", term], queryFn: async () => {
    const { data, error } = await supabase.from("pages").select("id, slug, name, avatar_url").ilike("name", matching).limit(30);
    if (error) throw error;
    return data ?? [];
  }, enabled: term.length > 0 });
  const foundGroups = (groups ?? []).filter((g) => g.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  const foundPages = (pages ?? []).filter((p) => p.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  const posts = term ? searchedPosts ?? [] : (discoveries ?? []).filter((post) => {
    if (filter === "Photos") return post.media_type === "image";
    if (filter === "Vidéos") return post.media_type === "video";
    if (filter === "Groupes") return Boolean(post.group_id);
    if (filter === "Pages") return Boolean(post.page_id);
    return true;
  });
  const postGrid = <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{(term ? searchingPosts : loadingPosts) ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-md" />) : posts.length === 0 ? <p className="col-span-3 py-6 text-sm text-muted-foreground">Aucune publication trouvée.</p> : posts.map((post) => <ExploreTile key={post.id} post={post} />)}</div>;
  const peopleList = <div className="space-y-1">{loadingPeople ? <Skeleton className="h-14 w-full" /> : people?.length ? people.map((person) => <Link key={person.id} to="/u/$username" params={{ username: person.username }} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary"><UserAvatar avatarPath={person.avatar_url} name={person.username} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{person.display_name || person.username}</span><span className="block truncate text-xs text-muted-foreground">@{person.username}</span></span></Link>) : <p className="py-4 text-sm text-muted-foreground">Aucune personne trouvée.</p>}</div>;
  const groupsList = <div className="space-y-1">{loadingGroups ? <Skeleton className="h-14 w-full" /> : foundGroups.length ? foundGroups.map((g) => <Link key={g.id} to="/g/$slug" params={{ slug: g.slug }} className="flex items-center gap-3 rounded-md px-2 py-3 hover:bg-secondary"><UserAvatar avatarPath={g.avatar_url} name={g.name} /><span className="min-w-0 truncate text-sm font-medium">{g.name}</span></Link>) : <p className="py-4 text-sm text-muted-foreground">Aucun groupe trouvé.</p>}</div>;
  const pagesList = <div className="space-y-1">{loadingPages ? <Skeleton className="h-14 w-full" /> : foundPages.length ? foundPages.map((p) => <Link key={p.id} to="/pg/$slug" params={{ slug: p.slug }} className="flex items-center gap-3 rounded-md px-2 py-3 hover:bg-secondary"><UserAvatar avatarPath={p.avatar_url} name={p.name} /><span className="min-w-0 truncate text-sm font-medium">{p.name}</span></Link>) : <p className="py-4 text-sm text-muted-foreground">Aucune page trouvée.</p>}</div>;
  return <div className="space-y-4"><h1 className="font-display text-2xl font-bold">{term ? `Résultats pour « ${term} »` : "Explorer"}</h1>
    {!term ? <><div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtres Explorer">{["Pour vous", "Photos", "Vidéos", "Groupes", "Pages"].map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "secondary"} className="shrink-0 rounded-full" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}</div>{postGrid}</> : <Tabs value={tab} onValueChange={setTab} className="w-full"><div className="-mx-3 overflow-x-auto px-3"><TabsList className="flex h-11 w-max min-w-full justify-start"><TabsTrigger value="all">Tout</TabsTrigger><TabsTrigger value="people">Personnes</TabsTrigger><TabsTrigger value="groups">Groupes</TabsTrigger><TabsTrigger value="pages">Pages</TabsTrigger><TabsTrigger value="posts">Publications</TabsTrigger></TabsList></div>
      <TabsContent value="all" className="space-y-5 pt-3"><section><h2 className="mb-2 text-sm font-semibold">Personnes</h2>{peopleList}</section><section><h2 className="mb-2 text-sm font-semibold">Groupes</h2>{groupsList}</section><section><h2 className="mb-2 text-sm font-semibold">Pages</h2>{pagesList}</section><section><h2 className="mb-2 text-sm font-semibold">Publications</h2>{postGrid}</section></TabsContent>
      <TabsContent value="people" className="pt-3">{peopleList}</TabsContent><TabsContent value="groups" className="pt-3">{groupsList}</TabsContent><TabsContent value="pages" className="pt-3">{pagesList}</TabsContent><TabsContent value="posts" className="pt-3">{postGrid}</TabsContent>
    </Tabs>}</div>;
}
