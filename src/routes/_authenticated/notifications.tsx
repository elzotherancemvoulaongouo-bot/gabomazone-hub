import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Heart, MessageCircle, MessageSquare, UserCheck } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/media";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationLabel,
  useNotifications,
  type NotificationRow,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Gabomazone" },
      {
        name: "description",
        content:
          "Vos alertes Gabomazone : nouveaux messages, demandes d'amis acceptées, j'aime et commentaires.",
      },
      { property: "og:title", content: "Notifications — Gabomazone" },
      { property: "og:description", content: "Suivez toute l'activité de votre compte Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS = {
  message: MessageSquare,
  friend_accepted: UserCheck,
  like: Heart,
  comment: MessageCircle,
} as const;

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useNotifications(true);
  const unread = (data ?? []).filter((n) => !n.read_at).length;

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        {unread > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
            Tout marquer comme lu
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 brand-surface px-4 py-12 text-center">
          <Bell className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationItem({ notification: n }: { notification: NotificationRow }) {
  const queryClient = useQueryClient();
  const Icon = ICONS[n.type] ?? Bell;

  async function onOpen() {
    if (n.read_at) return;
    await markNotificationRead(n.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const body = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/70 px-4 py-3 brand-surface",
        !n.read_at && "border-primary/50",
      )}
    >
      <UserAvatar avatarPath={n.actor?.avatar_url} name={n.actor?.username} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{notificationLabel(n)}</p>
        {n.preview ? <p className="truncate text-xs text-muted-foreground">{n.preview}</p> : null}
        <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      <Icon className={cn("size-5 shrink-0", n.read_at ? "text-muted-foreground" : "text-primary")} />
    </div>
  );

  if (n.type === "message" && n.conversation_id) {
    return (
      <li>
        <Link to="/m/$conversationId" params={{ conversationId: n.conversation_id }} onClick={onOpen}>
          {body}
        </Link>
      </li>
    );
  }
  if ((n.type === "like" || n.type === "comment") && n.post_id) {
    return (
      <li>
        <Link to="/p/$postId" params={{ postId: n.post_id }} onClick={onOpen}>
          {body}
        </Link>
      </li>
    );
  }
  if (n.type === "friend_accepted" && n.actor?.username) {
    return (
      <li>
        <Link to="/u/$username" params={{ username: n.actor.username }} onClick={onOpen}>
          {body}
        </Link>
      </li>
    );
  }
  return (
    <li onClick={onOpen}>
      {body}
    </li>
  );
}
