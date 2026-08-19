import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { useStories } from "@/lib/stories";
import { StoryViewer } from "@/components/StoryViewer";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
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
    queryKey: ["profile", userId],
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
  const [creating, setCreating] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const list = groups ?? [];
  const mine = list.find((g) => g.userId === userId);

  return (
    <section className="rounded-2xl border border-border/70 brand-surface p-3">
      <h2 className="sr-only">Stories</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={() =>
              mine ? setViewerIndex(list.indexOf(mine)) : setCreating(true)
            }
            className="relative"
            aria-label="Ma story"
          >
            <UserAvatar
              avatarPath={myAvatar}
              name={myName}
              className={cn("size-16 ring-2", mine ? "ring-primary" : "ring-border")}
            />
            <span
              onClick={(e) => {
                e.stopPropagation();
                setCreating(true);
              }}
              className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
            >
              <Plus className="size-4" />
            </span>
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
                <UserAvatar
                  avatarPath={group.avatarUrl}
                  name={group.username}
                  className={cn(
                    "size-16 ring-2",
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

      <CreateStoryDialog userId={userId} open={creating} onOpenChange={setCreating} />
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
