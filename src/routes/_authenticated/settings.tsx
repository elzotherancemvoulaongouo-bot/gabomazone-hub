import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET } from "@/lib/media";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres du profil — Gabomazone" },
      {
        name: "description",
        content:
          "Modifiez votre photo, votre nom, votre âge, votre pays, votre ville et vos contacts sur Gabomazone.",
      },
      { property: "og:title", content: "Paramètres du profil — Gabomazone" },
      { property: "og:description", content: "Personnalisez votre profil Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type FormState = {
  username: string;
  display_name: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender: string;
  country: string;
  city: string;
  phone: string;
  contact_email: string;
  website: string;
  bio: string;
};

const EMPTY: FormState = {
  username: "",
  display_name: "",
  first_name: "",
  last_name: "",
  birthdate: "",
  gender: "",
  country: "",
  city: "",
  phone: "",
  contact_email: "",
  website: "",
  bio: "",
};

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      username: data.username ?? "",
      display_name: data.display_name ?? "",
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      birthdate: data.birthdate ?? "",
      gender: data.gender ?? "",
      country: data.country ?? "",
      city: data.city ?? "",
      phone: data.phone ?? "",
      contact_email: data.contact_email ?? "",
      website: data.website ?? "",
      bio: data.bio ?? "",
    });
    setAvatarPath(data.avatar_url ?? null);
  }, [data]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setAvatarPath(path);
      toast.success("Photo prête, n'oubliez pas d'enregistrer.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const username = form.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        throw new Error("Le pseudo doit contenir 3 à 30 caractères (lettres, chiffres, _).");
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: form.display_name.trim() || null,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          birthdate: form.birthdate || null,
          gender: form.gender.trim() || null,
          country: form.country.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          contact_email: form.contact_email.trim() || null,
          website: form.website.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url: avatarPath,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil mis à jour !");
      navigate({ to: "/me" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement"),
  });

  if (isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="font-display text-2xl font-bold">Paramètres du profil</h1>

      <div className="flex items-center gap-4">
        <UserAvatar avatarPath={avatarPath} name={form.username} className="size-20" />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <Camera className="size-4 text-primary" />
          {uploading ? "Téléversement…" : "Changer la photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="username" label="Pseudo" value={form.username} onChange={(v) => set("username", v)} />
        <Field
          id="display_name"
          label="Nom affiché"
          value={form.display_name}
          onChange={(v) => set("display_name", v)}
        />
        <Field id="first_name" label="Prénom" value={form.first_name} onChange={(v) => set("first_name", v)} />
        <Field id="last_name" label="Nom" value={form.last_name} onChange={(v) => set("last_name", v)} />
        <Field
          id="birthdate"
          label="Date de naissance"
          type="date"
          value={form.birthdate}
          onChange={(v) => set("birthdate", v)}
        />
        <Field id="gender" label="Genre" value={form.gender} onChange={(v) => set("gender", v)} />
        <Field id="country" label="Pays" value={form.country} onChange={(v) => set("country", v)} />
        <Field id="city" label="Ville" value={form.city} onChange={(v) => set("city", v)} />
        <Field
          id="phone"
          label="Téléphone"
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
        />
        <Field
          id="contact_email"
          label="E-mail de contact"
          type="email"
          value={form.contact_email}
          onChange={(v) => set("contact_email", v)}
        />
        <Field id="website" label="Site web" value={form.website} onChange={(v) => set("website", v)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={3}
          maxLength={300}
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="Parlez de vous…"
        />
      </div>

      <Button type="submit" className="w-full" disabled={save.isPending || uploading}>
        {save.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={120} />
    </div>
  );
}
