import { useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { ImageCropDialog, AVATAR_CROP, checkCropFile } from "@/components/ImageCropDialog";
import { PHOTO_ACCEPT } from "@/lib/image-processing";

export function AvatarPhotoEditor({
  path,
  name,
  userId,
  onSave,
  label = "Changer la photo de profil",
}: {
  path: string | null;
  name: string;
  userId: string;
  onSave: (path: string) => Promise<void> | void;
  label?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar avatarPath={path} name={name} className="size-20 rounded-full" />
      <Button asChild variant="secondary" size="sm" className="min-w-0 whitespace-normal text-left">
        <label className="cursor-pointer">
          <Camera className="mr-2 size-4 shrink-0" />
          {label}
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            className="hidden"
            onChange={async (event) => {
              const selected = event.target.files?.[0];
              event.target.value = "";
              if (!selected) return;
              const error = await checkCropFile(selected, AVATAR_CROP);
              if (error) toast.error(error);
              else setFile(selected);
            }}
          />
        </label>
      </Button>
      <ImageCropDialog
        file={file}
        spec={AVATAR_CROP}
        onClose={() => setFile(null)}
        onSave={async (blob) => {
          const path = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from("media")
            .upload(path, blob, { contentType: "image/jpeg", upsert: false });
          if (error) throw error;
          await onSave(path);
          toast.success("Photo de profil mise à jour");
        }}
      />
    </div>
  );
}
