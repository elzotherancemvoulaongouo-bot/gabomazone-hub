import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, RotateCcw, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Caméra plein écran : autorisation navigateur, prise de photo, prévisualisation,
 * reprise, validation. Bascule automatiquement vers la galerie si indisponible.
 */
export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ url: string; file: File } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open || shot) return;
    let cancelled = false;
    async function start() {
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Caméra indisponible ou autorisation refusée. Vous pouvez choisir une photo depuis votre appareil.",
          );
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, shot, stop]);

  useEffect(() => {
    if (!open) {
      stop();
      setShot(null);
      setError(null);
    }
  }, [open, stop]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        stop();
        setShot({ url: URL.createObjectURL(blob), file });
      },
      "image/jpeg",
      0.9,
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer la caméra">
          <X className="size-6" />
        </Button>
        <span className="font-display text-sm font-semibold">Caméra Gabomazone</span>
        {shot || error ? (
          <span className="size-10" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Changer de caméra"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          >
            <SwitchCamera className="size-6" />
          </Button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/60">
        {shot ? (
          <img src={shot.url} alt="Aperçu de la photo" className="max-h-full w-full object-contain" />
        ) : error ? (
          <p className="px-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-6 py-6">
        {shot ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => setShot(null)}>
              <RotateCcw className="mr-2 size-5" /> Reprendre
            </Button>
            <Button
              size="lg"
              onClick={() => {
                onCapture(shot.file);
                setShot(null);
                onClose();
              }}
            >
              Utiliser la photo
            </Button>
          </>
        ) : error ? (
          <Button size="lg" onClick={() => fallbackInputRef.current?.click()}>
            <ImageIcon className="mr-2 size-5" /> Choisir une photo
          </Button>
        ) : (
          <button
            type="button"
            onClick={takePhoto}
            aria-label="Prendre la photo"
            className="size-18 rounded-full border-4 border-primary p-1 transition-transform active:scale-95"
          >
            <span className="block size-14 rounded-full bg-primary" />
          </button>
        )}
      </div>

      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onCapture(file);
            onClose();
          }
        }}
      />
    </div>
  );
}