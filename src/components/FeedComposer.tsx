import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/Avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";

export function FeedComposer({
  userId,
  defaultVisibility = "public",
}: {
  userId: string;
  defaultVisibility?: string;
}) {
  const [mode, setMode] = useState<null | "text" | "photo" | "video" | "camera">(null);

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
      {mode ? null : <div className="flex items-center gap-3">
        <UserAvatar avatarPath={profile?.avatar_url} name={profile?.username} />
        <Button
          type="button"
          onClick={() => setMode("text")}
          variant="secondary" className="h-11 min-w-0 flex-1 justify-start rounded-full px-4 text-left text-sm text-muted-foreground"
        >
          Que voulez-vous publier ?
        </Button>
      </div>

      </div>}

      {mode ? null : <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/60 pt-2">
        <Button
          type="button"
          onClick={() => setMode("photo")}
          variant="ghost" className="h-11 min-w-0 gap-1 px-1 text-xs font-medium text-muted-foreground"
        >
          <ImagePlus className="size-5 text-primary" /> Photo
        </Button>
        <Button
          type="button"
          onClick={() => setMode("video")}
          variant="ghost" className="h-11 min-w-0 gap-1 px-1 text-xs font-medium text-muted-foreground"
        >
          <Video className="size-5 text-primary" /> Vidéo
        </Button>
        <Button
          type="button"
          onClick={() => setMode("camera")}
          variant="ghost" className="h-11 min-w-0 gap-1 px-1 text-xs font-medium text-muted-foreground"
        >
          <Camera className="size-5 text-primary" /> Caméra
        </Button>
      </div>

      </div>}

      {mode ? (
        <CreatePostDialog
          open
          onOpenChange={(next) => !next && setMode(null)}
          userId={userId}
          avatarPath={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? profile?.username ?? null}
          defaultVisibility={defaultVisibility}
          startWithCamera={mode === "camera"}
          startWithPicker={mode === "photo" || mode === "video"}
          pickerAccept={mode === "photo" ? "image/*" : mode === "video" ? "video/*" : "image/*,video/*"}
          inline
        />
      ) : null}
    </section>
  );
}