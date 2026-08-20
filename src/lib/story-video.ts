export const MAX_STORY_VIDEO_SECONDS = 30;

export function loadVideoMeta(file: File): Promise<{ duration: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => resolve({ duration: video.duration || 0, url });
    video.onerror = () => reject(new Error("Vidéo illisible"));
  });
}

/**
 * Découpe une vidéo à 30 s max en réencodant le segment choisi (audio conservé).
 * Fonctionne dans les navigateurs mobiles modernes via MediaRecorder + captureStream.
 */
export async function trimVideo(
  file: File,
  startSeconds: number,
  onProgress?: (ratio: number) => void,
): Promise<File> {
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.muted = false;
  video.playsInline = true;
  (video as HTMLVideoElement & { volume: number }).volume = 0.0001;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Vidéo illisible"));
  });

  const capture = (video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  });
  const getStream = capture.captureStream ?? capture.mozCaptureStream;
  if (typeof getStream !== "function" || typeof MediaRecorder === "undefined") {
    throw new Error("Découpage impossible sur cet appareil : choisissez une vidéo de 30 s maximum.");
  }

  video.currentTime = startSeconds;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const stream = getStream.call(video);
  const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
    (type) => MediaRecorder.isTypeSupported?.(type),
  );
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
  });

  recorder.start(200);
  await video.play();

  const end = startSeconds + MAX_STORY_VIDEO_SECONDS;
  await new Promise<void>((resolve) => {
    const tick = () => {
      const ratio = Math.min(1, (video.currentTime - startSeconds) / MAX_STORY_VIDEO_SECONDS);
      onProgress?.(ratio);
      if (video.currentTime >= end || video.ended) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  video.pause();
  recorder.stop();
  const blob = await done;
  const ext = (recorder.mimeType || "video/webm").includes("mp4") ? "mp4" : "webm";
  return new File([blob], `story-${Date.now()}.${ext}`, { type: blob.type });
}
