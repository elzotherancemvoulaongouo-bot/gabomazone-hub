import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchMyRequests, relationOf } from "@/lib/friends";
import { getOrCreateConversation } from "@/lib/messages";

export function MessageButton({ profileId }: { profileId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const me = user?.id;

  const { data: requests } = useQuery({
    queryKey: ["friend-requests", me],
    queryFn: () => fetchMyRequests(me as string),
    enabled: Boolean(me),
  });

  const open = useMutation({
    mutationFn: () => getOrCreateConversation(me as string, profileId),
    onSuccess: (conversationId) =>
      navigate({ to: "/m/$conversationId", params: { conversationId } }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Discussion impossible"),
  });

  if (!me || me === profileId || !requests) return null;
  if (relationOf(requests, me, profileId).state !== "friends") return null;

  return (
    <Button variant="outline" size="sm" disabled={open.isPending} onClick={() => open.mutate()}>
      <MessageCircle className="size-4" /> Message
    </Button>
  );
}
