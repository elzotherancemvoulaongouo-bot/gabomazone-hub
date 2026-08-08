import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Media } from "@/components/Media";
import { fetchPost, updatePost, uploadPostMedia } from "@/lib/posts";

export const Route = createFileRoute("/_authenticated/post-edit/$postId")({
  head: () => ({
    meta: [
      { title: "Modifier la publication — Gabomazone" },
      {
        name: "description",
        content: "Modifiez le texte, le lieu ou le média de votre publication Gabomazone.",
      },
      { property: "og:title", content: "Modifier la publication — Gabomazone" },
      { property: "og:description", content: "Mettez à jour votre publication Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditPostPage,
});

function EditPostPage() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post, isPending } = useQuery({ queryKey: ["post", postId], queryFn: () => fetchPost(postId) });

  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption ?? "");
      setLocation(post.location ?? "");
    }
  }, [post]);

  const save = useMutation({
    mutationFn: async () => {
      if (!post) return;
      const text = caption.trim();
      const keepsMedia = Boolean(post.media_url) && !removeMedia;
      if (!text && !file && !keepsMedia) throw new Error("Ajoutez du texte ou un média");

      let media: { media_url?: string | null; media_type?: string | null } = {};
      if (file) {
        const uploaded = await uploadPostMedia(user.id, file);
        media = { media_url: uploaded.path, media_type: uploaded.type };
      } else if (removeMedia) {
        media = { media_url: null, media_type: null };
      }
      await updatePost(postId, { caption: text || null, location: location.trim() || null, ...media });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Publication mise à jour");
      navigate({ to: "/p/$postId", params: { postId } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Modification impossible"),
  });

  if (isPending) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (!post) return <p className="text-sm text-muted-foreground">Publication introuvable.</p>;
  if (post.user_id !== user.id)
    return <p className="text-sm text-muted-foreground">Vous ne pouvez modifier que vos publications.</p>;

  const showsExisting = Boolean(post.media_url) && !removeMedia && !preview;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="font-display text-2xl font-bold">Modifier la publication</h1>

      <div className="space-y-2">
        <Label htmlFor="caption">Votre texte</Label>
        <Textarea id="caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>

      {showsExisting ? (
        <div className="space-y-2">
          <Media
            path={post.media_url as string}
            type={post.media_type ?? "image"}
            alt={post.caption ?? "Publication"}
            className="aspect-square w-full rounded-2xl bg-muted object-cover"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveMedia(true)}>
            <Trash2 className="mr-2 size-4" /> Retirer le média
          </Button>
        </div>
      ) : null}

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
            {post.media_url && !removeMedia ? "Remplacer la photo ou la vidéo" : "Ajouter une photo ou une vidéo"}
          </span>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : null);
            if (selected) setRemoveMedia(false);
          }}
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="location">Lieu</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={save.isPending}>
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/p/$postId", params: { postId } })}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
