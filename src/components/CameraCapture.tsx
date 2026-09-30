import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, RotateCcw, SwitchCamera, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Shot = { url: string; file: File; kind: "image" | "video" };

export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
    setRecording(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const host = document.createElement("div");
    host.id = "gabomazone-camera-root";
    document.body.appendChild(host);
    document.body.setAttribute("data-camera-open", "true");
    setPortalHost(host);
    const doc = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    if (doc.pictureInPictureElement) void doc.exitPictureInPicture?.().catch(() => undefined);
    return () => {
      document.body.removeAttribute("data-camera-open");
      host.remove();
      setPortalHost(null);
      stop();
    };
  }, [open, stop]);

  useEffect(() => {
    // Wait for the portal's video element before requesting permission and attaching the stream.
    if (!open || !portalHost || shot) return;
    let cancelled = false;
    async function start() {
      setError(null);
      setReady(false);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "La caméra nécessite une connexion sécurisée (HTTPS) et un navigateur compatible. Choisissez un média sur votre appareil.",
        );
        return;
      }
      let stream: MediaStream | null = null;
      let failure: unknown;
      for (const constraints of [
        { video: { facingMode: { ideal: facing } }, audio: false },
        { video: true, audio: false },
      ] as MediaStreamConstraints[]) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (cause) {
          failure = cause;
        }
      }
      if (cancelled) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!stream) {
        const name = (failure as { name?: string } | null)?.name;
        setError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "Accès à la caméra refusé. Autorisez-la dans les réglages du navigateur, puis réessayez."
            : name === "NotFoundError"
              ? "Aucune caméra détectée sur cet appareil."
              : name === "NotReadableError"
                ? "La caméra est déjà utilisée par une autre application. Fermez-la et réessayez."
                : "Caméra indisponible. Vous pouvez choisir une photo ou une vidéo depuis votre appareil.",
        );
        return;
      }
      streamRef.current = stream;
      const preview = videoRef.current;
      if (preview) {
        preview.srcObject = stream;
        try {
          await preview.play();
        } catch {
          /* autoPlay/playsInline also retries on interaction */
        }
        if (!cancelled) setReady(true);
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, portalHost, facing, shot, attempt, stop]);

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  function takePhoto() {
    const preview = videoRef.current;
    if (!preview?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Impossible de capturer cette photo. Réessayez.");
          return;
        }
        stop();
        setShot({
          url: URL.createObjectURL(blob),
          file: new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
          kind: "image",
        });
      },
      "image/jpeg",
      0.9,
    );
  }

  async function startRecording() {
    if (!streamRef.current || !ready || !window.MediaRecorder) {
      setError(
        "L'enregistrement vidéo n'est pas disponible sur ce navigateur. Choisissez une vidéo depuis votre appareil.",
      );
      return;
    }
    const stream = streamRef.current;
    // Microphone is optional: a denial must not block recording the image.
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (streamRef.current !== stream) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      mic.getAudioTracks().forEach((track) => stream.addTrack(track));
    } catch {
      /* Record without sound if microphone permission was denied. */
    }
    try {
      const preferred = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (!chunks.length) return;
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(chunks, { type });
        setShot({
          url: URL.createObjectURL(blob),
          file: new File([blob], `video-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`, {
            type,
          }),
          kind: "video",
        });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Enregistrement vidéo impossible. Choisissez une vidéo depuis votre appareil.");
    }
  }

  if (!open || !portalHost) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Caméra"
      className="fixed inset-0 flex h-[100dvh] w-screen flex-col bg-foreground text-background"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-background hover:bg-background/20 hover:text-background"
          onClick={onClose}
          aria-label="Fermer la caméra"
        >
          <X className="size-6" />
        </Button>
        <span className="truncate text-center font-display text-sm font-semibold">
          Caméra Gabomazone
        </span>
        {!shot && !error && !recording ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-background hover:bg-background/20 hover:text-background"
            aria-label="Changer de caméra"
            onClick={() => {
              stop();
              setFacing((current) => (current === "user" ? "environment" : "user"));
            }}
          >
            <SwitchCamera className="size-6" />
          </Button>
        ) : (
          <span className="size-9" />
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-foreground">
        {shot ? (
          shot.kind === "video" ? (
            <video
              src={shot.url}
              controls
              playsInline
              className="max-h-full w-full object-contain"
            />
          ) : (
            <img
              src={shot.url}
              alt="Aperçu de la photo"
              className="max-h-full w-full object-contain"
            />
          )
        ) : error ? (
          <p role="alert" className="px-8 text-center text-sm text-background/80">
            {error}
          </p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
            {!ready && (
              <p className="absolute bottom-4 text-xs text-background/80">
                Démarrage de la caméra…
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex min-h-28 flex-wrap items-center justify-center gap-3 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {shot ? (
          <>
            <Button variant="secondary" onClick={() => setShot(null)}>
              <RotateCcw className="size-4" /> Reprendre
            </Button>
            <Button
              onClick={() => {
                onCapture(shot.file);
                onClose();
              }}
            >
              Utiliser
            </Button>
          </>
        ) : error ? (
          <>
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              <RotateCcw className="size-4" /> Réessayer
            </Button>
            <Button onClick={() => fallbackInputRef.current?.click()}>
              <ImageIcon className="size-4" /> Galerie
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:bg-background/20 hover:text-background"
              aria-label="Choisir dans la galerie"
              onClick={() => fallbackInputRef.current?.click()}
            >
              <ImageIcon className="size-6" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={!ready || recording}
              onClick={takePhoto}
              aria-label="Prendre la photo"
              className="size-16 rounded-full border-4 border-primary bg-background text-foreground"
            >
              <span className="size-10 rounded-full bg-primary" />
            </Button>
            <Button
              variant={recording ? "destructive" : "ghost"}
              size="icon"
              disabled={!ready}
              aria-label={recording ? "Arrêter la vidéo" : "Enregistrer une vidéo"}
              onClick={() => {
                if (recording) {
                  recorderRef.current?.stop();
                  setRecording(false);
                } else void startRecording();
              }}
              className={
                recording
                  ? "size-12 rounded-full"
                  : "size-12 rounded-full text-background hover:bg-background/20 hover:text-background"
              }
            >
              <Video className="size-6" />
            </Button>
          </>
        )}
      </div>
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) {
            Array.from(files).forEach(onCapture);
            onClose();
          }
          event.target.value = "";
        }}
      />
    </div>,
    portalHost,
  );
}
