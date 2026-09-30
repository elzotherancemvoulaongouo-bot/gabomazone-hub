import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { followPage, joinGroup, type GroupRow } from "@/lib/communities";
import type { NotificationRow } from "@/lib/notifications";

/** Page/group invitation with inline "Suivre" / "Rejoindre" action. */
export function InviteNotificationItem({
  notification: n,
  body,
  onOpen,
}: {
  notification: NotificationRow;
  body: ReactNode;
  onOpen: () => void;
}) {
  const { user } = useAuth();
  const me = user?.id;
  const queryClient = useQueryClient();
  const isPage = n.type === "page_invite";
  const targetId = (isPage ? n.page_id : n.group_id) ?? null;

  const target = useQuery({
    queryKey: ["invite-target", n.type, targetId, me],
    enabled: Boolean(targetId && me),
    queryFn: async () => {
      if (isPage) {
        const [p, f] = await Promise.all([
          supabase.from("pages").select("slug").eq("id", targetId!).maybeSingle(),
          supabase.from("page_followers").select("user_id").eq("page_id", targetId!).eq("user_id", me!).maybeSingle(),
        ]);
        return { slug: p.data?.slug ?? null, done: Boolean(f.data), group: null as GroupRow | null };
      }
      const [g, m] = await Promise.all([
        supabase.from("groups").select("*").eq("id", targetId!).maybeSingle(),
        supabase.from("group_members").select("status").eq("group_id", targetId!).eq("user_id", me!).maybeSingle(),
      ]);
      return { slug: g.data?.slug ?? null, done: Boolean(m.data), group: (g.data as GroupRow) ?? null };
    },
  });

  const act = useMutation({
    mutationFn: async () => {
      if (isPage) await followPage(targetId!, me!);
      else await joinGroup(target.data!.group!, me!);
    },
    onSuccess: async () => {
      onOpen();
      toast.success(isPage ? "Vous suivez cette page" : target.data?.group?.is_private ? "Demande envoyée" : "Vous avez rejoint le groupe");
      await queryClient.invalidateQueries({ queryKey: ["invite-target"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  const slug = target.data?.slug;
  return (
    <li className="space-y-2">
      {slug ? (
        isPage ? (
          <Link to="/pg/$slug" params={{ slug }} onClick={onOpen}>{body}</Link>
        ) : (
          <Link to="/g/$slug" params={{ slug }} onClick={onOpen}>{body}</Link>
        )
      ) : (
        <div onClick={onOpen}>{body}</div>
      )}
      {target.data && slug ? (
        <div className="flex justify-end px-2">
          {target.data.done ? (
            <span className="text-xs text-muted-foreground">{isPage ? "Déjà abonné" : "Déjà membre ou demande envoyée"}</span>
          ) : (
            <Button size="sm" onClick={() => act.mutate()} disabled={act.isPending}>
              {isPage ? "Suivre" : "Rejoindre"}
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}
