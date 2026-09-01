import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  COVER_ACCEPT,
  COVER_RATIO,
  cropToCoverBlob,
  uploadCover,
  useCoverUrl,
  validateCoverFile,
} from "@/lib/covers";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  path: string | null;
  editable?: boolean;
  /** Propriétaire du fichier (dossier de stockage) — l'utilisateur connecté. */
  userId?: string | undefined;
  /** Persiste la nouvelle valeur cover_url puis rafraîchit l'affichage. */
  onSave?: (coverValue: string) => Promise<void> | void;
  className?: string;
};

export function CoverPhoto({ path, editable = false, userId, onSave, className }: Props) {
  const { data: url } = useCoverUrl(path);
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = validateCoverFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSrc(URL.createObjectURL(file));
  }

  async function handleConfirm(blob: Blob) {
    if (!userId) return;
    setSaving(true);
    try {
      const value = await uploadCover(blob, userId);
      await onSave?.(value);
      toast.success("Photo de couverture mise à jour !");
      setSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={
        className ??
        "relative h-36 overflow-hidden rounded-2xl border border-border/70 brand-surface sm:h-52"
      }
    >
      {url ? (
        <img src={url} alt="Photo de couverture" className="size-full object-cover" />
      ) : (
        <div className="size-full bg-gradient-to-br from-primary/25 via-secondary to-background" />
      )}

      {editable ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute bottom-2 right-2 z-10 bg-background/85 backdrop-blur"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-2 size-4" />
            <span className="hidden sm:inline">
              {path ? "Changer la photo de couverture" : "Ajouter une photo de couverture"}
            </span>
            <span className="sm:hidden">Couverture</span>
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={COVER_ACCEPT}
            className="hidden"
            onChange={pick}
          />
          <CoverCropDialog
            src={src}
            saving={saving}
            onCancel={() => setSrc(null)}
            onConfirm={handleConfirm}
          />
        </>
      ) : null}
    </div>
  );
}

function CoverCropDialog({
  src,
  saving,
  onCancel,
  onConfirm,
}: {
  src: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function geometry() {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !img.naturalWidth) return null;
    const w = frame.clientWidth;
    const h = w / COVER_RATIO;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * zoom;
    return { w, h, scale, dw: img.naturalWidth * scale, dh: img.naturalHeight * scale };
  }

  function clamp(x: number, y: number) {
    const g = geometry();
    if (!g) return { x, y };
    return {
      x: Math.min(0, Math.max(g.w - g.dw, x)),
      y: Math.min(0, Math.max(g.h - g.dh, y)),
    };
  }

  function reset() {
    const g = geometry();
    if (!g) return;
    setOffset({ x: (g.w - g.dw) / 2, y: (g.h - g.dh) / 2 });
  }

  function onZoom(value: number) {
    setZoom(value);
    requestAnimationFrame(() => setOffset((prev) => clamp(prev.x, prev.y)));
  }

  function confirm() {
    const g = geometry();
    const img = imgRef.current;
    if (!g || !img) return;
    void cropToCoverBlob(img, {
      sx: -offset.x / g.scale,
      sy: -offset.y / g.scale,
      sw: g.w / g.scale,
      sh: g.h / g.scale,
    }).then(onConfirm);
  }

  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => (!open && !saving ? onCancel() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recadrer la couverture</DialogTitle>
          <DialogDescription>
            Déplacez l'image et ajustez le zoom pour composer votre bannière.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={frameRef}
          className="relative w-full touch-none overflow-hidden rounded-xl border border-border/70 bg-black"
          style={{ aspectRatio: String(COVER_RATIO) }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const next = clamp(
              drag.current.ox + (e.clientX - drag.current.x),
              drag.current.oy + (e.clientY - drag.current.y),
            );
            setOffset(next);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {src ? (
            <img
              ref={imgRef}
              src={src}
              alt="Aperçu de la couverture"
              onLoad={reset}
              draggable={false}
              className="max-w-none origin-top-left select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                width: geometry() ? `${geometry()!.dw}px` : undefined,
              }}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => onZoom(v[0] ?? 1)}
            className="flex-1"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={confirm} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {saving ? "Envoi…" : "Enregistrer la couverture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
