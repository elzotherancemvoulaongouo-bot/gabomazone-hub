import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Globe, ImagePlus, Lock, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/Avatar";
import { CameraCapture } from "@/components/CameraCapture";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPost, uploadPostMedia } from "@/lib/posts";
import { cn } from "@/lib/utils";

type Draft = { id: string; file: File; url: string; kind: "image" | "video" };

const VISIBILITIES = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Amis", icon: Users },
  { value: "only_me", label: "Moi uniquement", icon: Lock },
] as const;

export function CreatePostDialog({
  open,
  onOpenChange,
  userId,
  avatarPath,
  displayName,
  defaultVisibility = "public",
  pageId,
  groupId,
  startWithCamera = false,
  startWithPicker = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  avatarPath?: string | null;
  displayName?: string | null;
  defaultVisibility?: string;
  pageId?: string | null;
  groupId?: string | null;
  startWithCamera?: boolean;
  startWithPicker?: boolean;
}) {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setVisibility(defaultVisibility);
    if (startWithCamera) setCameraOpen(true);
    if (startWithPicker) setTimeout(() => fileRef.current?.click(), 80);
  }, [open, startWithCamera, startWithPicker, defaultVisibility]);

  function addFiles(files: FileList | File[]) {
    const next: Draft[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video");
      if (!isVideo && !file.type.startsWith("image")) continue;
      next.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        kind: isVideo ? "video" : "image",
      });
    }
    if (next.length) setDrafts((prev) => [...prev, ...next]);
  }

  function move(index: number, delta: number) {
    setDrafts((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item!);
      return copy;
    });
  }

  function reset() {
    setCaption("");
    setLocation("");
    setDrafts([]);
  }

  const publish = useMutation({
    mutationFn: async () => {
      const text = caption.trim();
      if (!text && drafts.length === 0) throw new Error("Ajoutez du texte ou un média");
      const uploaded = [];
      for (const draft of drafts) {
        const result = await uploadPostMedia(userId, draft.file);
        uploaded.push({ path: result.path, type: result.type });
      }
      await createPost({
        userId,
        caption: text || null,
        location: location.trim() || null,
        visibility,
        pageId: pageId ?? null,
        groupId: groupId ?? null,
        media: uploaded,
      });
    },
    onSuccess: async () => {
      reset();
      onOpenChange(false);
      await queryClient.invalidateQueries();
      toast.success("Publication en ligne !");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Publication impossible"),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !publish.isPending && onOpenChange(next)}>
        <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Créer une publication</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <UserAvatar avatarPath={avatarPath} name={displayName} />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {VISIBILITIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs",
                    visibility === value && "border-primary text-primary",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            autoFocus
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Que voulez-vous publier ?"
            aria-label="Texte de la publication"
            className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />

          {drafts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {drafts.map((draft, index) => (
                <div key={draft.id} className="relative overflow-hidden rounded-xl border border-border/70">
                  {draft.kind === "video" ? (
                    <video src={draft.url} className="aspect-square w-full object-cover" controls playsInline />
                  ) : (
                    <img src={draft.url} alt="Média sélectionné" className="aspect-square w-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Retirer ce média"
                    onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/85 p-1.5"
                  >
                    <X className="size-4" />
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    <button
                      type="button"
                      aria-label="Déplacer vers la gauche"
                      onClick={() => move(index, -1)}
                      className="rounded-full bg-background/85 p-1.5"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Déplacer vers la droite"
                      onClick={() => move(index, 1)}
                      className="rounded-full bg-background/85 p-1.5"
                    >
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ajouter un lieu (facultatif)"
            aria-label="Lieu"
          />

          <div className="flex items-center gap-2 rounded-xl border border-border/70 p-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-2 size-5 text-primary" /> Photo/Vidéo
            </Button>
            <Button type="button" variant="ghost" className="h-11 flex-1" onClick={() => setCameraOpen(true)}>
              <Camera className="mr-2 size-5 text-primary" /> Caméra
            </Button>
          </div>

          <Button
            type="button"
            size="lg"
            className="h-12 w-full"
            disabled={publish.isPending || (!caption.trim() && drafts.length === 0)}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Publication…" : "Publier"}
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </DialogContent>
      </Dialog>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => addFiles([file])}
      />
    </>
  );
}