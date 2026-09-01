import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/media";

export const COVERS_BUCKET = "covers";
export const COVER_PREFIX = "covers:";
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";
export const COVER_RATIO = 8 / 3;

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateCoverFile(file: File) {
  if (!ALLOWED.includes(file.type.toLowerCase())) {
    return "Format non pris en charge. Utilisez une image JPG, PNG ou WEBP.";
  }
  if (file.size > COVER_MAX_BYTES) {
    return `Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 5 Mo.`;
  }
  return null;
}

/** Résout une valeur cover_url : nouveau bucket "covers", ancien bucket "media", ou URL externe. */
export async function resolveCoverUrl(value: string) {
  if (value.startsWith(COVER_PREFIX)) {
    const path = value.slice(COVER_PREFIX.length);
    const { data, error } = await supabase.storage
      .from(COVERS_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }
  return getSignedUrl(value);
}

export function useCoverUrl(value: string | null | undefined) {
  return useQuery({
    queryKey: ["cover-url", value],
    queryFn: () => resolveCoverUrl(value as string),
    enabled: Boolean(value),
    staleTime: 1000 * 60 * 45,
  });
}

/** Recadre l'image au format bannière et renvoie un JPEG prêt à l'envoi. */
export async function cropToCoverBlob(
  image: HTMLImageElement,
  crop: { sx: number; sy: number; sw: number; sh: number },
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = Math.round(1600 / COVER_RATIO);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Recadrage impossible sur cet appareil.");
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Recadrage impossible.");
  return blob;
}

/** Envoie la couverture dans le bucket dédié et renvoie la valeur à stocker en base. */
export async function uploadCover(blob: Blob, userId: string) {
  const path = `${userId}/cover-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(COVERS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return `${COVER_PREFIX}${path}`;
}
