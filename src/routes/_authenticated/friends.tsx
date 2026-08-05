import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/Avatar";
import { FriendButton } from "@/components/FriendButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchMyRequests,
  fetchProfilesByIds,
  respondToRequest,
  searchProfiles,
  type FriendProfile,
} from "@/lib/friends";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Amis — Gabomazone" },
      {
        name: "description",
        content: "Gérez vos amis, vos demandes reçues et trouvez de nouveaux membres sur Gabomazone.",
      },
      { property: "og:title", content: "Amis — Gabomazone" },
      { property: "og:description", content: "Vos amis et demandes d'amis sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FriendsPage,
});

function PersonRow({ profile, children }: { profile: FriendProfile; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
      <Link to="/u/$username" params={{ username: profile.username }} className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar avatarPath={profile.avatar_url} name={profile.username} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {profile.display_name || profile.username}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            @{profile.username}
            {profile.city ? ` · ${profile.city}` : ""}
          </span>
        </span>
      </Link>
      {children}
    </li>
  );
}

function FriendsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  const { data: requests, isPending } = useQuery({
    queryKey: ["friend-requests", user.id],
    queryFn: () => fetchMyRequests(user.id),
  });

  const incoming = (requests ?? []).filter((r) => r.status === "pending" && r.receiver_id === user.id);
  const outgoing = (requests ?? []).filter((r) => r.status === "pending" && r.sender_id === user.id);
  const friendIds = (requests ?? [])
    .filter((r) => r.status === "accepted")
    .map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id));
  const peopleIds = [
    ...new Set([...friendIds, ...incoming.map((r) => r.sender_id), ...outgoing.map((r) => r.receiver_id)]),
  ];

  const { data: people } = useQuery({
    queryKey: ["friend-profiles", peopleIds.join(",")],
    queryFn: () => fetchProfilesByIds(peopleIds),
    enabled: peopleIds.length > 0,
  });

  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  const { data: results, isFetching } = useQuery({
    queryKey: ["profile-search", query],
    queryFn: () => searchProfiles(query, user.id),
    enabled: query.trim().length > 0,
  });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      respondToRequest(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friend-requests"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Amis</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(term);
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Rechercher un membre…"
          aria-label="Rechercher un membre"
        />
        <Button type="submit" size="icon" aria-label="Rechercher">
          <Search className="size-4" />
        </Button>
      </form>

      {query.trim() && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Résultats</h2>
          {isFetching ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : (results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
          ) : (
            <ul className="space-y-2">
              {(results ?? []).map((p) => (
                <PersonRow key={p.id} profile={p}>
                  <FriendButton profileId={p.id} />
                </PersonRow>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Demandes reçues ({incoming.length})
        </h2>
        {isPending ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((r) => {
              const p = byId.get(r.sender_id);
              if (!p) return null;
              return (
                <PersonRow key={r.id} profile={p}>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: r.id, status: "accepted" })}
                    >
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: r.id, status: "declined" })}
                    >
                      Refuser
                    </Button>
                  </div>
                </PersonRow>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Mes amis ({friendIds.length})
        </h2>
        {friendIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vous n'avez pas encore d'amis.</p>
        ) : (
          <ul className="space-y-2">
            {friendIds.map((id) => {
              const p = byId.get(id);
              return p ? <PersonRow key={id} profile={p} /> : null;
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Demandes envoyées ({outgoing.length})
          </h2>
          <ul className="space-y-2">
            {outgoing.map((r) => {
              const p = byId.get(r.receiver_id);
              return p ? (
                <PersonRow key={r.id} profile={p}>
                  <FriendButton profileId={p.id} />
                </PersonRow>
              ) : null;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
