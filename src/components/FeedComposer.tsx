import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";

export function FeedComposer({
  userId,
  defaultVisibility = "public",
}: {
  userId: string;
  defaultVisibility?: string;
}) {
  const [mode, setMode] = useState<null | "text" | "media" | "camera">(null);

  const { data: profile } = useQuery({
    queryKey: ["profile-brief", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="rounded-2xl border border-border/70 brand-surface p-3">
      <div className="flex items-center gap-3">
        <UserAvatar avatarPath={profile?.avatar_url} name={profile?.username} />
        <button
          type="button"
          onClick={() => setMode("text")}
          className="h-11 flex-1 rounded-full bg-secondary px-4 text-left text-sm text-muted-foreground"
        >
          Que voulez-vous publier ?
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setMode("media")}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <ImagePlus className="size-5 text-primary" /> Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("media")}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Video className="size-5 text-primary" /> Vidéo
        </button>
        <button
          type="button"
          onClick={() => setMode("camera")}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Camera className="size-5 text-primary" /> Caméra
        </button>
      </div>

      {mode ? (
        <CreatePostDialog
          open
          onOpenChange={(next) => !next && setMode(null)}
          userId={userId}
          avatarPath={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? profile?.username ?? null}
          defaultVisibility={defaultVisibility}
          startWithCamera={mode === "camera"}
          startWithPicker={mode === "media"}
        />
      ) : null}
    </section>
  );
}