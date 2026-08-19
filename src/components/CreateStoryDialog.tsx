import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateStory } from "@/lib/stories";
import { toast } from "sonner";

export function CreateStoryDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateStory(userId);

  const previewUrl = file ? URL.createObjectURL(file) : null;

  async function submit() {
    if (!file && !caption.trim()) {
      toast.error("Ajoutez une photo, une vidéo ou du texte.");
      return;
    }
    try {
      await create.mutateAsync({ file, caption });
      toast.success("Story publiée pour 24 h");
      setFile(null);
      setCaption("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication impossible");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une story</DialogTitle>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          file?.type.startsWith("video") ? (
            <video src={previewUrl} controls playsInline className="max-h-72 w-full rounded-xl bg-black" />
          ) : (
            <img src={previewUrl} alt="Aperçu" className="max-h-72 w-full rounded-xl object-contain" />
          )
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground"
          >
            <ImagePlus className="size-7 text-primary" />
            Photo ou vidéo
          </button>
        )}

        {file ? (
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
            Retirer le média
          </Button>
        ) : null}

        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Ajouter du texte…"
          rows={3}
        />

        <Button onClick={submit} disabled={create.isPending} className="h-11 w-full">
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Publier ma story"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Votre story disparaît automatiquement après 24 heures.
        </p>
      </DialogContent>
    </Dialog>
  );
}
