import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/Avatar";
import { VoiceMessage } from "@/components/VoiceMessage";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/media";
import {
  fetchConversation,
  fetchMessages,
  fetchProfile,
  markConversationRead,
  otherUserId,
  sendTextMessage,
  sendVoiceMessage,
} from "@/lib/messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/m/$conversationId")({
  head: () => ({
    meta: [
      { title: "Discussion — Gabomazone" },
      {
        name: "description",
        content: "Conversation privée en texte et en notes vocales sur Gabomazone.",
      },
      { property: "og:title", content: "Discussion — Gabomazone" },
      { property: "og:description", content: "Conversation privée sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { user } = Route.useRouteContext();
  const { conversationId } = Route.useParams();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchConversation(conversationId),
  });

  const peerId = conversation ? otherUserId(conversation, user.id) : null;

  const { data: peer } = useQuery({
    queryKey: ["profile", peerId],
    queryFn: () => fetchProfile(peerId as string),
    enabled: Boolean(peerId),
  });

  const { data: messages, isPending } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  useEffect(() => {
    if (messages && messages.length > 0) void markConversationRead(conversationId, user.id);
  }, [conversationId, messages, user.id]);

  const sendText = useMutation({
    mutationFn: () => sendTextMessage(conversationId, user.id, text),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Envoi impossible"),
  });

  const sendVoice = useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration: number }) =>
      sendVoiceMessage(conversationId, user.id, blob, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Envoi impossible"),
  });

  const busy = sendText.isPending || sendVoice.isPending;

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Retour à la messagerie">
          <Link to="/messages">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        {peer ? (
          <Link to="/u/$username" params={{ username: peer.username }} className="flex items-center gap-3">
            <UserAvatar avatarPath={peer.avatar_url} name={peer.username} />
            <span>
              <span className="block text-sm font-semibold">{peer.display_name || peer.username}</span>
              <span className="block text-xs text-muted-foreground">@{peer.username}</span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-10 w-40 rounded-xl" />
        )}
      </div>

      <div className="flex-1 space-y-3 pb-4">
        {isPending ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message. Dites bonjour !</p>
        ) : (
          (messages ?? []).map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.kind === "voice" && m.audio_path ? (
                    <VoiceMessage path={m.audio_path} duration={m.duration_seconds} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                  <span className="mt-1 block text-[10px] opacity-70">{timeAgo(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-20 flex items-center gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) sendText.mutate();
        }}
      >
        <VoiceRecorder
          disabled={busy}
          onSend={(blob, duration) => sendVoice.mutateAsync({ blob, duration })}
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez un message…"
          aria-label="Message"
        />
        <Button type="submit" size="icon" aria-label="Envoyer" disabled={busy || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
