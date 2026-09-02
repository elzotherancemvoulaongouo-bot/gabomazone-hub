import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Type as TypeIcon } from "lucide-react";
import { useStories } from "@/lib/stories";
import { StoryThumb } from "@/components/StoryThumb";
import { StoryViewer } from "@/components/StoryViewer";
import { CreateStoryDialog, type StoryDraft } from "@/components/CreateStoryDialog";
import { cn } from "@/lib/utils";

export function StoriesBar({
  userId,
  avatarPath,
  username,
}: {
  userId: string;
  avatarPath?: string | null | undefined;
  username?: string | null | undefined;
}) {
  const { data: groups } = useStories(userId);
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
  const myAvatar = avatarPath ?? profile?.avatar_url;
  const myName = username ?? profile?.username;
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = groups ?? [];
  const mine = list.find((g) => g.userId === userId);
  const myLatest = mine?.stories.at(-1);

  return (
    <section className="rounded-2xl border border-border/70 brand-surface p-3">
      <h2 className="sr-only">Statuts</h2>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setDraft({ mode: "media", file });
        }}
      />

      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex w-16 shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => (mine ? setViewerIndex(list.indexOf(mine)) : inputRef.current?.click())}
            aria-label={mine ? "Voir votre story" : "Créer un statut"}
          >
            <StoryThumb
              story={myLatest}
              fallbackAvatar={myAvatar}
              fallbackName={myName}
              className={cn("ring-2", mine ? "ring-primary" : "ring-border")}
            />
          </button>
          <button
            type="button"
            aria-label="Ajouter un statut photo ou vidéo"
            onClick={() => inputRef.current?.click()}
            className="absolute right-0 top-[42px] flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Créer un statut écrit"
            onClick={() => setDraft({ mode: "text" })}
            className="absolute left-0 top-[42px] flex size-6 items-center justify-center rounded-full border-2 border-background bg-secondary text-foreground"
          >
            <TypeIcon className="size-3.5" />
          </button>
          <span className="w-full truncate text-center text-[11px] text-muted-foreground">
            Votre story
          </span>
        </div>

        {list
          .filter((g) => g.userId !== userId)
          .map((group) => (
            <div key={group.userId} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setViewerIndex(list.indexOf(group))}
                aria-label={`Story de ${group.displayName ?? group.username}`}
              >
                <StoryThumb
                  story={group.stories[0]}
                  fallbackAvatar={group.avatarUrl}
                  fallbackName={group.username}
                  className={cn(
                    "ring-2",
                    group.hasUnseen ? "ring-primary" : "ring-border/60 opacity-80",
                  )}
                />
              </button>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                {group.displayName ?? group.username}
              </span>
            </div>
          ))}
      </div>

      <CreateStoryDialog userId={userId} draft={draft} onOpenChange={() => setDraft(null)} />
      {viewerIndex !== null && list[viewerIndex] ? (
        <StoryViewer
          groups={list}
          startGroup={viewerIndex}
          currentUserId={userId}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </section>
  );
}
