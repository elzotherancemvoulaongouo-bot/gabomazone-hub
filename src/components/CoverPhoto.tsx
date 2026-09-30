import { useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCoverUrl, uploadCover } from "@/lib/covers";
import { ImageCropDialog, PAGE_COVER_CROP, GROUP_COVER_CROP, checkCropFile } from "@/components/ImageCropDialog";
import { PHOTO_ACCEPT } from "@/lib/image-processing";

type Props = { path: string | null; editable?: boolean; userId?: string; onSave?: (coverValue: string) => Promise<void> | void; className?: string; kind?: "group" | "page" };

export function CoverPhoto({ path, editable = false, userId, onSave, className, kind = "page" }: Props) {
  const { data: url } = useCoverUrl(path);
  const [file, setFile] = useState<File | null>(null);
  const spec = kind === "group" ? GROUP_COVER_CROP : PAGE_COVER_CROP;
  return <div className={className ?? "relative aspect-[851/315] w-full overflow-hidden rounded-lg border border-border bg-secondary"}>
    {url ? <img src={url} alt="Photo de couverture" className="size-full object-cover" /> : <div className="size-full bg-secondary" />}
    {editable && userId ? <>
      <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2 z-10 bg-background/85" asChild><label className="cursor-pointer"><Camera className="mr-2 size-4" />Couverture<input type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={async (event) => { const selected = event.target.files?.[0]; event.target.value = ""; if (!selected) return; const error = await checkCropFile(selected, spec); if (error) toast.error(error); else setFile(selected); }} /></label></Button>
      <ImageCropDialog file={file} spec={spec} onClose={() => setFile(null)} onSave={async (blob) => { const value = await uploadCover(blob, userId); await onSave?.(value); toast.success("Couverture mise à jour"); }} />
    </> : null}
  </div>;
}