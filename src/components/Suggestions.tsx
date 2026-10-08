import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/Avatar";
import { FriendButton } from "@/components/FriendButton";
import { Button } from "@/components/ui/button";
import {
  useCommunitySuggestions,
  useDismissSuggestion,
  usePeopleSuggestions,
} from "@/lib/recommendations";

export function PeopleSuggestions({ limit = 10, compact = false }: { limit?: number; compact?: boolean }) {
  const { data = [], isLoading } = usePeopleSuggestions(limit);
  const dismiss = useDismissSuggestion();
  if (isLoading || data.length === 0) {
    return compact ? null : (
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Chargement…" : "Aucune suggestion pour le moment."}
      </p>
    );
  }
  return (
    <div className={compact ? "flex gap-3 overflow-x-auto pb-2" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
      {data.map((p) => (
        <div
          key={p.id}
          className={`relative flex shrink-0 flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center ${compact ? "w-40" : ""}`}
        >
          <button
            aria-label="Ignorer"
            onClick={() => dismiss.mutate({ type: "user", id: p.id })}
            className="absolute right-1 top-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <Link to="/u/$username" params={{ username: p.username }} className="flex flex-col items-center gap-1">
            <UserAvatar src={p.avatar_url} name={p.display_name ?? p.username} className="h-16 w-16" />
            <span className="line-clamp-1 text-sm font-semibold">{p.display_name ?? p.username}</span>
          </Link>
          <span className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
            {p.reasons[0] ?? "Nouveau sur Gabomazone"}
          </span>
          <FriendButton profileId={p.id} />
        </div>
      ))}
    </div>
  );
}

export function CommunitySuggestions({ limit = 10 }: { limit?: number }) {
  const { data = [], isLoading } = useCommunitySuggestions(limit);
  const dismiss = useDismissSuggestion();
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment.</p>;
  return (
    <ul className="space-y-2">
      {data.map((c) => (
        <li key={c.kind + c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <UserAvatar src={c.avatar_url} name={c.name} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-semibold">{c.name}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {c.kind === "group" ? "Groupe" : "Page"}
              {c.category ? ` · ${c.category}` : ""}
              {c.reasons[0] ? ` · ${c.reasons[0]}` : ""}
            </p>
          </div>
          <Button asChild size="sm">
            {c.kind === "group" ? (
              <Link to="/g/$slug" params={{ slug: c.slug }}>Voir</Link>
            ) : (
              <Link to="/pg/$slug" params={{ slug: c.slug }}>Voir</Link>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismiss.mutate({ type: c.kind, id: c.id })}
          >
            Ignorer
          </Button>
        </li>
      ))}
    </ul>
  );
}
