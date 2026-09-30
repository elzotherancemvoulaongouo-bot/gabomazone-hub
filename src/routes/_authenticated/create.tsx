import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { createPost, uploadPostMedia } from "@/lib/posts";
import { PHOTO_ACCEPT, VIDEO_ACCEPT, validatePostFile } from "@/lib/image-processing";
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
    if (selected) {
      const error = validatePostFile(selected);
      if (error) {
        toast.error(error);
        e.target.value = "";
        return;
      }
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    const text = caption.trim();
    if (!file && !text) return;
    setUploading(true);
    try {
      const media = file ? [await uploadPostMedia(user.id, file)] : [];
      await createPost({
        userId: user.id,
        media,
        caption: text || null,
        location: location.trim() || null,
      });

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

      <div className="space-y-2">
        <Label htmlFor="caption">Votre texte</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Racontez votre moment…"
          rows={4}
        />
      </div>

      <label className="flex min-h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border brand-surface">
        {preview ? (
          file?.type.startsWith("video") ? (
            <video src={preview} className="size-full object-cover" controls playsInline />
          ) : (
            <img src={preview} alt="Aperçu" className="size-full object-cover" />
          )
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <ImagePlus className="size-10 text-primary" />
            Ajouter une photo ou une vidéo (facultatif)
          </span>
        )}
        <input
          type="file"
          accept={`${PHOTO_ACCEPT},${VIDEO_ACCEPT}`}
          className="hidden"
          onChange={onFileChange}
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Libreville, Gabon"
        />
      </div>

      <Button type="submit" className="w-full" disabled={(!file && !caption.trim()) || uploading}>
        {uploading ? "Publication…" : "Publier"}
      </Button>
    </form>
  );
}
