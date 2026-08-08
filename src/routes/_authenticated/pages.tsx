import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/Avatar";
import { createPage, fetchMyPages, fetchPages, type PageRow } from "@/lib/communities";

export const Route = createFileRoute("/_authenticated/pages")({
  head: () => ({
    meta: [
      { title: "Pages — Gabomazone" },
      {
        name: "description",
        content: "Créez et suivez des pages de marques, artistes et commerces sur Gabomazone.",
      },
      { property: "og:title", content: "Pages — Gabomazone" },
      { property: "og:description", content: "Découvrez les pages de la communauté Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PagesPage,
});

function PagesPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const all = useQuery({ queryKey: ["pages"], queryFn: fetchPages });
  const mine = useQuery({ queryKey: ["my-pages", user.id], queryFn: () => fetchMyPages(user.id) });

  const create = useMutation({
    mutationFn: () => createPage(user.id, { name, description }),
    onSuccess: async (page) => {
      setName("");
      setDescription("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      await queryClient.invalidateQueries({ queryKey: ["my-pages", user.id] });
      toast.success("Page créée !");
      navigate({ to: "/pg/$slug", params: { slug: page.slug } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Création impossible"),
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Pages</h1>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 size-4" /> Créer une page
        </Button>
      </div>

      {open ? (
        <form
          className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="page-name">Nom de la page</Label>
            <Input id="page-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ma boutique" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-desc">Description</Label>
            <Textarea
              id="page-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Que proposez-vous ?"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || create.isPending}>
            Créer la page
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mes pages</h2>
        {mine.isPending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (mine.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Vous n'avez pas encore de page.</p>
        ) : (
          <ul className="space-y-2">
            {(mine.data ?? []).map((p) => (
              <PageItem key={p.id} page={p} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Découvrir</h2>
        {all.isPending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (all.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune page pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {(all.data ?? []).map((p) => (
              <PageItem key={p.id} page={p} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PageItem({ page }: { page: PageRow }) {
  return (
    <li>
      <Link
        to="/pg/$slug"
        params={{ slug: page.slug }}
        className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-3"
      >
        {page.avatar_url ? (
          <UserAvatar avatarPath={page.avatar_url} name={page.name} />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
            <Store className="size-5 text-primary" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{page.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {page.description || `@${page.slug}`}
          </span>
        </span>
      </Link>
    </li>
  );
}
