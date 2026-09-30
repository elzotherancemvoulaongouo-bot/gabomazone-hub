import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { canvasBlob, loadImage, validateImage } from "@/lib/image-processing";

export type CropSpec = {
  title: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
};
export const AVATAR_CROP: CropSpec = {
  title: "Photo de profil",
  width: 320,
  height: 320,
  minWidth: 176,
  minHeight: 176,
};
export const PAGE_COVER_CROP: CropSpec = {
  title: "Couverture",
  width: 851,
  height: 315,
  minWidth: 851,
  minHeight: 315,
};
export const GROUP_COVER_CROP: CropSpec = {
  title: "Couverture du groupe",
  width: 1640,
  height: 922,
  minWidth: 1640,
  minHeight: 922,
};

export function ImageCropDialog({
  file,
  spec,
  onClose,
  onSave,
}: {
  file: File | null;
  spec: CropSpec;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const ratio = spec.width / spec.height;

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function geometry(level = zoom) {
    const img = image.current;
    const box = frame.current;
    if (!img?.naturalWidth || !box) return null;
    const w = box.clientWidth;
    const h = w / ratio;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * level;
    return { w, h, scale, dw: img.naturalWidth * scale, dh: img.naturalHeight * scale };
  }
  function clamp(x: number, y: number, level = zoom) {
    const g = geometry(level);
    if (!g) return { x, y };
    return { x: Math.min(0, Math.max(g.w - g.dw, x)), y: Math.min(0, Math.max(g.h - g.dh, y)) };
  }
  async function confirm() {
    const img = image.current;
    const g = geometry();
    if (!img || !g) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Recadrage indisponible sur cet appareil.");
      context.drawImage(
        img,
        -offset.x / g.scale,
        -offset.y / g.scale,
        g.w / g.scale,
        g.h / g.scale,
        0,
        0,
        spec.width,
        spec.height,
      );
      await onSave(await canvasBlob(canvas));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(file)}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recadrer — {spec.title}</DialogTitle>
          <DialogDescription>
            Déplacez la photo et ajustez le zoom. Aperçu du résultat avant enregistrement.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={frame}
          className="relative mx-auto w-full touch-none overflow-hidden border border-border bg-muted"
          style={{ aspectRatio: ratio }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(event) => {
            if (drag.current)
              setOffset(
                clamp(
                  drag.current.ox + event.clientX - drag.current.x,
                  drag.current.oy + event.clientY - drag.current.y,
                ),
              );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {src ? (
            <img
              ref={image}
              src={src}
              alt="Aperçu du recadrage"
              draggable={false}
              onLoad={() => {
                const g = geometry();
                if (g) setOffset({ x: (g.w - g.dw) / 2, y: (g.h - g.dh) / 2 });
              }}
              className="absolute left-0 top-0 max-w-none origin-top-left select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                width: geometry() ? `${geometry()?.dw}px` : undefined,
              }}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            className="flex-1"
            onValueChange={(values) => {
              const level = values[0] ?? 1;
              setZoom(level);
              setOffset((prev) => clamp(prev.x, prev.y, level));
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={confirm} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function checkCropFile(file: File, spec: CropSpec) {
  const error = validateImage(file);
  if (error) return error;
  try {
    const image = await loadImage(file);
    if (image.naturalWidth < spec.minWidth || image.naturalHeight < spec.minHeight)
      return `Image trop petite : minimum ${spec.minWidth} × ${spec.minHeight} px (10 Mo maximum).`;
    return null;
  } catch {
    return "Image illisible. Choisissez une autre photo.";
  }
}
