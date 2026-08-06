import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MAX_VOICE_SECONDS, formatDuration } from "@/lib/messages";

export function VoiceRecorder({
  onSend,
  disabled,
}: {
  onSend: (blob: Blob, duration: number) => Promise<void> | void;
  disabled?: boolean;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; url: string; duration: number } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setClip({ blob, url: URL.createObjectURL(blob), duration: secondsRef.current });
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_VOICE_SECONDS) stop();
      }, 1000);
    } catch {
      toast.error("Micro indisponible. Autorisez l'accès au microphone.");
    }
  }

  const secondsRef = useRef(0);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stop();
    setRecording(false);
  }

  function discard() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setSeconds(0);
    secondsRef.current = 0;
  }

  if (clip) {
    return (
      <div className="flex w-full items-center gap-2 rounded-xl border border-border/70 p-2">
        <audio src={clip.url} controls className="h-9 min-w-0 flex-1" />
        <span className="text-xs text-muted-foreground">{formatDuration(clip.duration)}</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la note vocale" onClick={discard}>
          <Trash2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label="Envoyer la note vocale"
          disabled={disabled}
          onClick={async () => {
            await onSend(clip.blob, clip.duration);
            discard();
          }}
        >
          <Send className="size-4" />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-primary/40 p-2">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="flex-1 text-sm">Enregistrement… {formatDuration(seconds)}</span>
        <Button type="button" size="icon" variant="secondary" aria-label="Arrêter l'enregistrement" onClick={stop}>
          <Square className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="icon" variant="secondary" aria-label="Enregistrer une note vocale" onClick={start} disabled={disabled}>
      <Mic className="size-5" />
    </Button>
  );
}
