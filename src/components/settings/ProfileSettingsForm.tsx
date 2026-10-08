import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfileById } from "@/lib/posts";
import { CoverPhoto } from "@/components/CoverPhoto";
import { AvatarPhotoEditor } from "@/components/AvatarPhotoEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

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

export function ProfileSettingsForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      return fetchProfileById(userId);
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
    setCoverPath((data as { cover_url?: string | null }).cover_url ?? null);
  }, [data]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
          cover_url: coverPath,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil mis à jour !");
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
      <div className="space-y-4">
        <CoverPhoto
          path={coverPath}
          editable
          userId={userId}
          onSave={async (value) => {
            const { error } = await supabase
              .from("profiles")
              .update({ cover_url: value })
              .eq("id", userId);
            if (error) throw error;
            setCoverPath(value);
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
          }}
        />
        <AvatarPhotoEditor
          path={avatarPath}
          name={form.username}
          userId={userId}
          onSave={async (value) => {
            const { error } = await supabase
              .from("profiles")
              .update({ avatar_url: value })
              .eq("id", userId);
            if (error) throw error;
            setAvatarPath(value);
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="username"
          label="Pseudo"
          value={form.username}
          onChange={(v) => set("username", v)}
        />
        <Field
          id="display_name"
          label="Nom affiché"
          value={form.display_name}
          onChange={(v) => set("display_name", v)}
        />
        <Field
          id="first_name"
          label="Prénom"
          value={form.first_name}
          onChange={(v) => set("first_name", v)}
        />
        <Field
          id="last_name"
          label="Nom"
          value={form.last_name}
          onChange={(v) => set("last_name", v)}
        />
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
        <Field
          id="website"
          label="Site web"
          value={form.website}
          onChange={(v) => set("website", v)}
        />
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

      <Button type="submit" className="h-12 w-full" disabled={save.isPending}>
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
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        className="h-11"
      />
    </div>
  );
}
