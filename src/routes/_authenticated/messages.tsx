import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/media";
import { fetchConversations } from "@/lib/messages";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messagerie — Gabomazone" },
      {
        name: "description",
        content: "Discutez en privé, en texte et en notes vocales, avec vos amis sur Gabomazone.",
      },
      { property: "og:title", content: "Messagerie — Gabomazone" },
      { property: "og:description", content: "Vos conversations privées sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const { data, isPending } = useQuery({
    queryKey: ["conversations", user.id],
    queryFn: () => fetchConversations(user.id),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Messagerie</h1>
        <Button asChild variant="secondary" size="sm">
          <Link to="/friends">
            <MessageSquarePlus className="size-4" /> Nouvelle discussion
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune conversation. Ouvrez le profil d'un ami et appuyez sur « Message ».
        </p>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map(({ conversation, profile }) => (
            <li key={conversation.id}>
              <Link
                to="/m/$conversationId"
                params={{ conversationId: conversation.id }}
                className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
              >
                <UserAvatar avatarPath={profile?.avatar_url} name={profile?.username} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {profile?.display_name || profile?.username || "Membre"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {conversation.last_message_preview ?? "Nouvelle conversation"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(conversation.last_message_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
