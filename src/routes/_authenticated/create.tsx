import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Nouvelle publication — Gabomazone" },
      {
        name: "description",
        content: "Publiez une photo ou une vidéo avec une légende sur Gabomazone.",
      },
      { property: "og:title", content: "Nouvelle publication — Gabomazone" },
      { property: "og:description", content: "Partagez une photo ou une vidéo sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        media_url: path,
        media_type: file.type.startsWith("video") ? "video" : "image",
        caption: caption.trim() || null,
        location: location.trim() || null,
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Publication en ligne !");
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la publication");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handlePublish} className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Nouvelle publication</h1>

      <label className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border brand-surface">
        {preview ? (
          file?.type.startsWith("video") ? (
            <video src={preview} className="size-full object-cover" controls playsInline />
          ) : (
            <img src={preview} alt="Aperçu" className="size-full object-cover" />
          )
        ) : (
          <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="size-10 text-primary" />
            Choisir une photo ou une vidéo
          </span>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onFileChange}
philosophy        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="caption">Légende</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Racontez votre moment…"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Libreville, Gabon"
        />
      </div>

      <Button type="submit" className="w-full" disabled={!file || uploading}>
        {uploading ? "Publication…" : "Publier"}
      </Button>
    </form>
  );
}