export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function validateImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Utilisez une image JPG, PNG ou WEBP.";
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde : 10 Mo maximum avant compression.";
  return null;
}

export function validatePostFile(file: File) {
  if (file.type.startsWith("image/")) return validateImage(file);
  if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) return "Utilisez une vidéo MP4 ou MOV (H.264/AAC), ou une vidéo WEBM enregistrée par la caméra.";
  if (file.size > MAX_VIDEO_BYTES) return "Vidéo trop lourde : 100 Mo maximum par vidéo.";
  return null;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
    image.src = url;
  });
}

export function canvasBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Conversion de l'image impossible.")), "image/jpeg", quality));
}

/** Clamp the frame between 4:5 and 1.91:1; preserve all pixels for in-range images. */
export async function prepareFeedPhoto(file: File): Promise<File> {
  const error = validateImage(file);
  if (error) throw new Error(error);
  const image = await loadImage(file);
  const original = image.naturalWidth / image.naturalHeight;
  const ratio = Math.max(4 / 5, Math.min(1.91, original));
  const width = Math.min(1080, image.naturalWidth, Math.round(image.naturalHeight * ratio));
  const height = Math.round(width / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Compression impossible sur cet appareil.");
  const cropWidth = Math.min(image.naturalWidth, image.naturalHeight * ratio);
  const cropHeight = Math.min(image.naturalHeight, image.naturalWidth / ratio);
  context.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, width, height);
  const blob = await canvasBlob(canvas);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}