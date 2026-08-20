import { useEffect, useRef, useState } from "react";
import { Loader2, Scissors, Type as TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateStory, STORY_BACKGROUNDS } from "@/lib/stories";
import { loadVideoMeta, trimVideo, MAX_STORY_VIDEO_SECONDS } from "@/lib/story-video";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type StoryDraft = { mode: "text" } | { mode: "media"; file: File };

export function CreateStoryDialog({
  userId,
  draft,
  onOpenChange,
}: {
  userId: string;
  draft: StoryDraft | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [caption, setCaption] = useState("");
  const [background, setBackground] = useState<string>(STORY_BACKGROUNDS[0].id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimProgress, setTrimProgress] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const create = useCreateStory(userId);

  const file = draft?.mode === "media" ? draft.file : null;
  const isVideo = Boolean(file?.type.startsWith("video"));
  const tooLong = isVideo && duration > MAX_STORY_VIDEO_SECONDS + 0.3;

  useEffect(() => {
    setCaption("");
    setTrimStart(0);
    setDuration(0);
    setTrimProgress(null);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    if (file.type.startsWith("video")) {
      void loadVideoMeta(file)
        .then((meta) => setDuration(meta.duration))
        .catch(() => setDuration(0));
    }
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Aperçu du segment sélectionné pour le découpage
  useEffect(() => {
    if (videoRef.current && tooLong) videoRef.current.currentTime = trimStart;
  }, [trimStart, tooLong]);

  async function submit() {
    if (!file && !caption.trim()) {
      toast.error("Ajoutez une photo, une vidéo ou du texte.");
      return;
    }
    try {
      let finalFile = file;
      if (file && tooLong) {
        setTrimProgress(0);
        toast.info("Découpage des 30 secondes sélectionnées…");
        finalFile = await trimVideo(file, trimStart, setTrimProgress);
        setTrimProgress(null);
      }
      await create.mutateAsync({
        file: finalFile,
        caption,
        background: finalFile ? null : background,
      });
      toast.success("Statut publié pour 24 h");
      onOpenChange(false);
    } catch (error) {
      setTrimProgress(null);
      toast.error(error instanceof Error ? error.message : "Publication impossible");
    }
  }

  const bg = STORY_BACKGROUNDS.find((b) => b.id === background) ?? STORY_BACKGROUNDS[0];
  const busy = create.isPending || trimProgress !== null;

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {draft?.mode === "text" ? "Statut écrit" : "Nouveau statut"}
          </DialogTitle>
        </DialogHeader>

        {draft?.mode === "text" ? (
          <>
            <div
              className={cn(
                "flex h-64 items-center justify-center rounded-xl p-6",
                bg.className,
              )}
            >
              <p className="line-clamp-6 text-center text-xl font-bold text-white">
                {caption || "Écrivez quelque chose…"}
              </p>
            </div>
            <div className="flex gap-2">
              {STORY_BACKGROUNDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => setBackground(item.id)}
                  className={cn(
                    "size-9 rounded-full ring-2",
                    item.className,
                    background === item.id ? "ring-primary" : "ring-transparent",
                  )}
                />
              ))}
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Que voulez-vous dire ?"
              rows={3}
              autoFocus
            />
          </>
        ) : previewUrl ? (
          <>
            {isVideo ? (
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                playsInline
                className="max-h-72 w-full rounded-xl bg-black"
              />
            ) : (
              <img src={previewUrl} alt="Aperçu" className="max-h-72 w-full rounded-xl object-contain" />
            )}

            {tooLong ? (
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Scissors className="size-4 text-primary" />
                  Vidéo de {Math.round(duration)} s : choisissez les {MAX_STORY_VIDEO_SECONDS} s à
                  conserver (à partir de {Math.round(trimStart)} s).
                </p>
                <Slider
                  value={[trimStart]}
                  min={0}
                  max={Math.max(0, duration - MAX_STORY_VIDEO_SECONDS)}
                  step={1}
                  onValueChange={(v) => setTrimStart(v[0] ?? 0)}
                />
                {trimProgress !== null ? (
                  <p className="text-xs text-primary">
                    Découpage en cours… {Math.round(trimProgress * 100)} %
                  </p>
                ) : null}
              </div>
            ) : null}

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ajouter une légende…"
              rows={2}
            />
          </>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            <TypeIcon className="mx-auto mb-2 size-6 text-primary" />
            Aucun média sélectionné.
          </p>
        )}

        <Button onClick={submit} disabled={busy} className="h-11 w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Publier mon statut"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Votre statut disparaît automatiquement après 24 heures.
        </p>
      </DialogContent>
    </Dialog>
  );
}
