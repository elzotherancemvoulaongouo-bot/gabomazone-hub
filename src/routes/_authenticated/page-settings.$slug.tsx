import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/Avatar";
import { MEDIA_BUCKET } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import {
  addPageAdminByUsername,
  deletePage,
  fetchPageAdmins,
  fetchPageBySlug,
  removePageAdmin,
  updatePage,
} from "@/lib/communities";

export const Route = createFileRoute("/_authenticated/page-settings/$slug")({
  head: () => ({
    meta: [
      { title: "Paramètres de la page — Gabomazone" },
      { name: "description", content: "Gérez les informations, le logo et les administrateurs de votre page." },
      { property: "og:title", content: "Paramètres de la page — Gabomazone" },
      { property: "og:description", content: "Configurez votre page Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PageSettings,
});

function PageSettings() {
  const { slug } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page, isPending } = useQuery({ queryKey: ["page", slug], queryFn: () => fetchPageBySlug(slug) });
  const admins = useQuery({
    queryKey: ["page-admins", page?.id],
    queryFn: () => fetchPageAdmins(page!.id),
    enabled: Boolean(page),
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    phone: "",
    contact_email: "",
    website: "",
    city: "",
    country: "",
  });
  const [newAdmin, setNewAdmin] = useState("");

  useEffect(() => {
    if (page) {
      setForm({
        name: page.name ?? "",
        description: page.description ?? "",
        category: page.category ?? "",
        phone: page.phone ?? "",
        contact_email: page.contact_email ?? "",
        website: page.website ?? "",
        city: page.city ?? "",
        country: page.country ?? "",
      });
    }
  }, [page]);

  const save = useMutation({
    mutationFn: () =>
      updatePage(page!.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        phone: form.phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        website: form.website.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["page", slug] });
      toast.success("Page mise à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Enregistrement impossible"),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/pages/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      await updatePage(page!.id, { avatar_url: path });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["page", slug] });
      toast.success("Logo mis à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Envoi impossible"),
  });

  const addAdmin = useMutation({
    mutationFn: () => addPageAdminByUsername(page!.id, newAdmin),
    onSuccess: async () => {
      setNewAdmin("");
      await queryClient.invalidateQueries({ queryKey: ["page-admins", page?.id] });
      toast.success("Administrateur ajouté");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Ajout impossible"),
  });

  const removeAdmin = useMutation({
    mutationFn: (userId: string) => removePageAdmin(page!.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["page-admins", page?.id] }),
  });

  const remove = useMutation({
    mutationFn: () => deletePage(page!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Page supprimée");
      navigate({ to: "/pages" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
  });

  if (isPending) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (!page) return <p className="text-sm text-muted-foreground">Page introuvable.</p>;

  const fields: { key: keyof typeof form; label: string; placeholder?: string }[] = [
    { key: "name", label: "Nom" },
    { key: "category", label: "Catégorie", placeholder: "Commerce, artiste, association…" },
    { key: "city", label: "Ville" },
    { key: "country", label: "Pays" },
    { key: "phone", label: "Téléphone" },
    { key: "contact_email", label: "E-mail de contact" },
    { key: "website", label: "Site web" },
  ];

  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Paramètres de la page</h1>

      <div className="flex items-center gap-3">
        <UserAvatar avatarPath={page.avatar_url} name={page.name} />
        <label className="cursor-pointer text-sm text-primary">
          Changer le logo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar.mutate(f);
            }}
          />
        </label>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <Button type="submit" className="w-full" disabled={save.isPending}>
          Enregistrer
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Administrateurs</h2>
        <div className="flex gap-2">
          <Input
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            placeholder="Pseudo du membre"
            aria-label="Pseudo du nouvel administrateur"
          />
          <Button onClick={() => addAdmin.mutate()} disabled={!newAdmin.trim() || addAdmin.isPending}>
            <UserPlus className="size-4" />
          </Button>
        </div>
        <ul className="space-y-2">
          {(admins.data ?? []).map((a) => (
            <li
              key={a.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 brand-surface px-4 py-2"
            >
              <UserAvatar avatarPath={a.profile?.avatar_url} name={a.profile?.username} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {a.profile?.display_name || a.profile?.username}
              </span>
              <Button variant="ghost" size="icon" onClick={() => removeAdmin.mutate(a.user_id)} aria-label="Retirer">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {page.owner_id === user.id ? (
        <Button variant="destructive" className="w-full" onClick={() => remove.mutate()} disabled={remove.isPending}>
          <Trash2 className="mr-2 size-4" /> Supprimer la page
        </Button>
      ) : null}
    </section>
  );
}
