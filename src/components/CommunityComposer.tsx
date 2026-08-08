import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadPostMedia } from "@/lib/posts";

export function CommunityComposer({
  userId,
  pageId,
  groupId,
  placeholder,
}: {
  userId: string;
  pageId?: string;
  groupId?: string;
  placeholder?: string;
}) {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const publish = useMutation({
    mutationFn: async () => {
      const text = caption.trim();
      if (!text && !file) throw new Error("Ajoutez du texte ou un média");
      let media: { media_url: string | null; media_type: string | null } = {
        media_url: null,
        media_type: null,
      };
      if (file) {
        const uploaded = await uploadPostMedia(userId, file);
        media = { media_url: uploaded.path, media_type: uploaded.type };
      }
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        page_id: pageId ?? null,
        group_id: groupId ?? null,
        caption: text || null,
        ...media,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCaption("");
      setFile(null);
      await queryClient.invalidateQueries();
      toast.success("Publication en ligne !");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Publication impossible"),
  });

  return (
    <form
      className="space-y-2 rounded-2xl border border-border/70 brand-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        publish.mutate();
      }}
    >
      <Textarea
        rows={2}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={placeholder ?? "Écrire une publication…"}
        aria-label="Nouvelle publication"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <ImagePlus className="size-5 text-primary" />
          {file ? file.name.slice(0, 24) : "Photo ou vidéo"}
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button type="submit" size="sm" disabled={publish.isPending || (!caption.trim() && !file)}>
          <Send className="mr-1 size-4" /> Publier
        </Button>
      </div>
    </form>
  );
}
