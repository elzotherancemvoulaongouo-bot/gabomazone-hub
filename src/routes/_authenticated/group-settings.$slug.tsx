import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/Avatar";
import {
  approveMember,
  deleteGroup,
  fetchGroupBySlug,
  fetchGroupMembers,
  leaveGroup,
  setMemberRole,
  updateGroup,
} from "@/lib/communities";

export const Route = createFileRoute("/_authenticated/group-settings/$slug")({
  head: () => ({
    meta: [
      { title: "Paramètres du groupe — Gabomazone" },
      { name: "description", content: "Gérez la confidentialité, les membres et les administrateurs du groupe." },
      { property: "og:title", content: "Paramètres du groupe — Gabomazone" },
      { property: "og:description", content: "Configurez votre groupe Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupSettings,
});

function GroupSettings() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: group, isPending } = useQuery({ queryKey: ["group", slug], queryFn: () => fetchGroupBySlug(slug) });
  const members = useQuery({
    queryKey: ["group-members", group?.id],
    queryFn: () => fetchGroupMembers(group!.id),
    enabled: Boolean(group),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setIsPrivate(group.is_private);
    }
  }, [group]);

  const save = useMutation({
    mutationFn: () =>
      updateGroup(group!.id, {
        name: name.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", slug] });
      toast.success("Groupe mis à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Enregistrement impossible"),
  });

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ["group-members", group?.id] });

  const approve = useMutation({ mutationFn: (id: string) => approveMember(group!.id, id), onSuccess: invalidateMembers });
  const remove = useMutation({ mutationFn: (id: string) => leaveGroup(group!.id, id), onSuccess: invalidateMembers });
  const promote = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "member" }) => setMemberRole(group!.id, id, role),
    onSuccess: invalidateMembers,
  });
  const destroy = useMutation({
    mutationFn: () => deleteGroup(group!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Groupe supprimé");
      navigate({ to: "/groups" });
    },
  });

  if (isPending) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (!group) return <p className="text-sm text-muted-foreground">Groupe introuvable.</p>;

  const pending = (members.data ?? []).filter((m) => m.status === "pending");
  const approved = (members.data ?? []).filter((m) => m.status === "approved");

  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Paramètres du groupe</h1>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
          <Label htmlFor="private">Groupe privé</Label>
          <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>
        <Button type="submit" className="w-full" disabled={save.isPending}>
          Enregistrer
        </Button>
      </form>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Demandes en attente</h2>
          <ul className="space-y-2">
            {pending.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-2"
              >
                <UserAvatar avatarPath={m.profile?.avatar_url} name={m.profile?.username} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.profile?.display_name || m.profile?.username}
                </span>
                <Button size="icon" onClick={() => approve.mutate(m.user_id)} aria-label="Approuver">
                  <Check className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.user_id)} aria-label="Refuser">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Membres ({approved.length})</h2>
        <ul className="space-y-2">
          {approved.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-2"
            >
              <UserAvatar avatarPath={m.profile?.avatar_url} name={m.profile?.username} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {m.profile?.display_name || m.profile?.username}
                <span className="block text-xs text-muted-foreground">
                  {m.user_id === group.owner_id ? "Propriétaire" : m.role === "admin" ? "Administrateur" : "Membre"}
                </span>
              </span>
              {m.user_id === group.owner_id ? null : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      promote.mutate({ id: m.user_id, role: m.role === "admin" ? "member" : "admin" })
                    }
                  >
                    {m.role === "admin" ? "Retirer admin" : "Nommer admin"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.user_id)} aria-label="Exclure">
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {group.owner_id === user.id ? (
        <Button variant="destructive" className="w-full" onClick={() => destroy.mutate()} disabled={destroy.isPending}>
          <Trash2 className="mr-2 size-4" /> Supprimer le groupe
        </Button>
      ) : null}
    </section>
  );
}
