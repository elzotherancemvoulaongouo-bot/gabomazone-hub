import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, RotateCcw, SwitchCamera, X } from "lucide-react";
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
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shot, setShot] = useState<{ url: string; file: File } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open || shot) return;
    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("La caméra n'est pas disponible sur cet appareil ou ce navigateur.");
        return;
      }
      // Certains navigateurs refusent une contrainte exacte : on retente en mode libre.
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: facing } }, audio: false },
        { video: true, audio: false },
      ];
      let stream: MediaStream | null = null;
      let lastError: unknown = null;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!stream) {
        const name = (lastError as { name?: string } | null)?.name;
        setError(
          name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez la caméra dans votre navigateur, puis réessayez."
            : name === "NotFoundError"
              ? "Aucune caméra détectée sur cet appareil."
              : "Caméra indisponible. Vous pouvez choisir une photo depuis votre appareil.",
        );
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* la lecture démarre au premier geste utilisateur */
        }
        if (!cancelled) setReady(true);
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, shot, attempt, stop]);

  // Plein écran exclusif : masque toute l'application et ferme le Picture-in-Picture.
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const host = document.createElement("div");
    host.id = "gabomazone-camera-root";
    document.body.appendChild(host);
    document.body.setAttribute("data-camera-open", "true");
    setPortalHost(host);
    const doc = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    if (doc.pictureInPictureElement) void doc.exitPictureInPicture?.().catch(() => {});
    return () => {
      document.body.removeAttribute("data-camera-open");
      host.remove();
      setPortalHost(null);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      stop();
      setShot(null);
      setError(null);
    }
  }, [open, stop]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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

  if (!open || !portalHost) return null;

  return createPortal(
    <div className="fixed inset-0 flex h-[100dvh] w-screen flex-col bg-black text-white">
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

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        {shot ? (
          <img src={shot.url} alt="Aperçu de la photo" className="max-h-full w-full object-contain" />
        ) : error ? (
          <p className="px-8 text-center text-sm text-white/80">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
            {!ready ? (
              <p className="absolute bottom-4 text-xs text-white/80">Démarrage de la caméra…</p>
            ) : null}
          </>
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
          <>
            <Button variant="secondary" size="lg" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw className="mr-2 size-5" /> Réessayer
            </Button>
            <Button size="lg" onClick={() => fallbackInputRef.current?.click()}>
              <ImageIcon className="mr-2 size-5" /> Choisir une photo
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Choisir une photo existante"
              onClick={() => fallbackInputRef.current?.click()}
            >
              <ImageIcon className="size-6" />
            </Button>
            <button
              type="button"
              onClick={takePhoto}
              disabled={!ready}
              aria-label="Prendre la photo"
              className="size-20 rounded-full border-4 border-primary p-1 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className="block size-full rounded-full bg-primary" />
            </button>
            <span className="size-10" />
          </>
        )}
      </div>

      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onCapture(file);
            onClose();
          }
        }}
      />
    </div>,
    portalHost,
  );
}
