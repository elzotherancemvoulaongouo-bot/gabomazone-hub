import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  fetchMyRequests,
  relationOf,
  removeRequest,
  respondToRequest,
  sendFriendRequest,
} from "@/lib/friends";

export function FriendButton({ profileId }: { profileId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const me = user?.id;

  const { data: requests } = useQuery({
    queryKey: ["friend-requests", me],
    queryFn: () => fetchMyRequests(me as string),
    enabled: Boolean(me),
  });

  const mutation = useMutation({
    mutationFn: async (action: "send" | "accept" | "decline" | "remove") => {
      const rel = relationOf(requests ?? [], me as string, profileId);
      if (action === "send") return sendFriendRequest(me as string, profileId);
      if (!rel.row) return;
      if (action === "accept") return respondToRequest(rel.row.id, "accepted");
      if (action === "decline") return respondToRequest(rel.row.id, "declined");
      return removeRequest(rel.row.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  if (!me || me === profileId || !requests) return null;
  const { state } = relationOf(requests, me, profileId);
  const busy = mutation.isPending;

  if (state === "friends") {
    return (
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => mutation.mutate("remove")}>
        <UserCheck className="size-4" /> Amis
      </Button>
    );
  }

  if (state === "sent") {
    return (
      <Button variant="outline" size="sm" disabled={busy} onClick={() => mutation.mutate("remove")}>
        <UserX className="size-4" /> Annuler la demande
      </Button>
    );
  }

  if (state === "received") {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => mutation.mutate("accept")}>
          <Check className="size-4" /> Accepter
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => mutation.mutate("decline")}>
          <X className="size-4" /> Refuser
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" disabled={busy} onClick={() => mutation.mutate("send")}>
      <UserPlus className="size-4" /> Ajouter en ami
    </Button>
  );
}
