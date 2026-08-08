import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { createGroup, fetchGroups, fetchMyGroups, type GroupRow } from "@/lib/communities";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Groupes — Gabomazone" },
      {
        name: "description",
        content: "Créez ou rejoignez des groupes publics et privés entre amis sur Gabomazone.",
      },
      { property: "og:title", content: "Groupes — Gabomazone" },
      { property: "og:description", content: "Les groupes de la communauté Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const all = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const mine = useQuery({ queryKey: ["my-groups", user.id], queryFn: () => fetchMyGroups(user.id) });

  const create = useMutation({
    mutationFn: () => createGroup(user.id, { name, description, isPrivate }),
    onSuccess: async (group) => {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["my-groups", user.id] });
      toast.success("Groupe créé !");
      navigate({ to: "/g/$slug", params: { slug: group.slug } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Création impossible"),
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Groupes</h1>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 size-4" /> Créer un groupe
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
            <Label htmlFor="group-name">Nom du groupe</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amis de Libreville" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Description</Label>
            <Textarea
              id="group-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="À quoi sert ce groupe ?"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
            <span>
              <Label htmlFor="group-private">Groupe privé</Label>
              <span className="block text-xs text-muted-foreground">
                Les publications ne sont visibles que par les membres approuvés.
              </span>
            </span>
            <Switch id="group-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || create.isPending}>
            Créer le groupe
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mes groupes</h2>
        {mine.isPending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (mine.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Vous n'êtes membre d'aucun groupe.</p>
        ) : (
          <ul className="space-y-2">
            {(mine.data ?? []).map((g) => (
              <GroupItem key={g.id} group={g} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Découvrir</h2>
        {all.isPending ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (all.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun groupe pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {(all.data ?? []).map((g) => (
              <GroupItem key={g.id} group={g} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function GroupItem({ group }: { group: GroupRow }) {
  return (
    <li>
      <Link
        to="/g/$slug"
        params={{ slug: group.slug }}
        className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-3"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
          {group.is_private ? <Lock className="size-5 text-primary" /> : <Users className="size-5 text-primary" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{group.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {group.is_private ? "Privé" : "Public"}
            {group.description ? ` · ${group.description}` : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}
