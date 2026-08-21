import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createPost, uploadPostMedia } from "@/lib/posts";
import { UserAvatar } from "@/components/Avatar";

type Identity = "community" | "member";

export function CommunityComposer({
  userId,
  pageId,
  groupId,
  placeholder,
  communityName,
  communityAvatar,
  memberName,
  memberAvatar,
  canPostAsCommunity = true,
}: {
  userId: string;
  pageId?: string;
  groupId?: string;
  placeholder?: string;
  communityName?: string;
  communityAvatar?: string | null;
  memberName?: string | null;
  memberAvatar?: string | null;
  /** Pages : toujours au nom de la Page. Groupes : réservé aux admins. */
  canPostAsCommunity?: boolean;
}) {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [identity, setIdentity] = useState<Identity>(
    pageId ? "community" : canPostAsCommunity ? "community" : "member",
  );

  const previews = useMemo(
    () => files.map((f) => ({ url: URL.createObjectURL(f), isVideo: f.type.startsWith("video") })),
    [files],
  );

  const asCommunity = Boolean(pageId) || (Boolean(groupId) && identity === "community" && canPostAsCommunity);

  const publish = useMutation({
    mutationFn: async () => {
      const text = caption.trim();
      if (!text && files.length === 0) throw new Error("Ajoutez du texte ou un média");
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadPostMedia(userId, file));
      }
      await createPost({
        userId,
        caption: text || null,
        location: location.trim() || null,
        pageId: pageId ?? null,
        groupId: groupId ?? null,
        media: uploaded,
      });
      if (asCommunity) {
        // marque la publication comme officielle (identité de la Page/du Groupe)
        const { data } = await supabase
          .from("posts")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) await supabase.from("posts").update({ as_community: true }).eq("id", data.id);
      }
    },
    onSuccess: async () => {
      setCaption("");
      setLocation("");
      setFiles([]);
      await queryClient.invalidateQueries();
      toast.success("Publication en ligne !");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Publication impossible"),
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-border/70 brand-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        publish.mutate();
      }}
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          avatarPath={asCommunity ? (communityAvatar ?? null) : (memberAvatar ?? null)}
          name={asCommunity ? communityName : (memberName ?? undefined)}
          className="size-9"
        />
        <div className="min-w-0 text-xs">
          <p className="truncate font-semibold">
            {asCommunity ? (communityName ?? "Publication officielle") : (memberName ?? "Vous")}
          </p>
          <p className="text-muted-foreground">
            {asCommunity ? "Publie au nom de la communauté" : "Publie en votre nom"}
          </p>
        </div>
      </div>

      {groupId && canPostAsCommunity ? (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-xs">
          <button
            type="button"
            onClick={() => setIdentity("community")}
            className={`h-9 rounded-full font-medium transition-colors ${identity === "community" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            En tant que groupe
          </button>
          <button
            type="button"
            onClick={() => setIdentity("member")}
            className={`h-9 rounded-full font-medium transition-colors ${identity === "member" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            En mon nom
          </button>
        </div>
      ) : null}

      <Textarea
        rows={3}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={placeholder ?? "Écrire une publication…"}
        aria-label="Nouvelle publication"
      />

      {previews.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg">
              {p.isVideo ? (
                <video src={p.url} className="size-full object-cover" muted playsInline />
              ) : (
                <img src={p.url} alt="Aperçu" className="size-full object-cover" />
              )}
              <button
                type="button"
                aria-label="Retirer ce média"
                onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Lieu (facultatif)"
        aria-label="Lieu"
        className="h-10"
      />

      <div className="flex items-center justify-between gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <ImagePlus className="size-5 text-primary" />
          Photos ou vidéo
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
        </label>
        <div className="flex items-center gap-2">
          {caption || files.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCaption("");
                setFiles([]);
                setLocation("");
              }}
            >
              Annuler
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={publish.isPending || (!caption.trim() && files.length === 0)}>
            <Send className="mr-1 size-4" /> Publier
          </Button>
        </div>
      </div>
    </form>
  );
}
