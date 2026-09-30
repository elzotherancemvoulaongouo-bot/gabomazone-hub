import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsModerator } from "@/lib/moderation";
import { timeAgo } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Modération — Gabomazone" },
      { name: "description", content: "File des signalements réservée aux modérateurs." },
      { property: "og:title", content: "Modération — Gabomazone" },
      { property: "og:description", content: "Espace de modération Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModerationPage,
});

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
};
type Action = {
  id: string;
  action: string;
  target_type: string;
  note: string | null;
  created_at: string;
};
type Word = { id: string; word: string; severity: string };

const TYPE_LABEL: Record<string, string> = {
  post: "Publication",
  comment: "Commentaire",
  profile: "Profil",
  page: "Page",
  group: "Groupe",
};
const ACTION_LABEL: Record<string, string> = {
  delete: "Supprimé",
  warn: "Averti",
  suspend: "Suspendu",
  reject: "Rejeté",
};
const SEVERITY_LABEL: Record<string, string> = {
  reject: "Refuser",
  mask: "Masquer le mot",
  review: "Publier + revue",
};

function TargetLink({ type, id }: { type: string; id: string }) {
  if (type === "post")
    return (
      <Link to="/p/$postId" params={{ postId: id }} className="text-primary underline">
        Ouvrir
      </Link>
    );
  return <span className="text-xs text-muted-foreground">{id.slice(0, 8)}</span>;
}

function ModerationPage() {
  const { user } = Route.useRouteContext();
  const { data: isMod, isPending } = useIsModerator(user.id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"queue" | "log" | "words">("queue");
  const [word, setWord] = useState("");
  const [severity, setSeverity] = useState("mask");

  const reports = useQuery({
    queryKey: ["mod-reports"],
    enabled: Boolean(isMod),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports" as never)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Report[];
    },
  });
  const log = useQuery({
    queryKey: ["mod-log"],
    enabled: Boolean(isMod) && tab === "log",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_actions" as never)
        .select("id, action, target_type, note, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Action[];
    },
  });
  const words = useQuery({
    queryKey: ["mod-words"],
    enabled: Boolean(isMod) && tab === "words",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_words" as never)
        .select("id, word, severity")
        .order("word");
      if (error) throw error;
      return (data ?? []) as unknown as Word[];
    },
  });

  const act = useMutation({
    mutationFn: async (v: { id: string; action: string; note?: string; days?: number }) => {
      const { error } = await supabase.rpc("moderate_report" as never, {
        _report_id: v.id,
        _action: v.action,
        _note: v.note ?? null,
        _days: v.days ?? 7,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Décision enregistrée");
      void qc.invalidateQueries({ queryKey: ["mod-reports"] });
      void qc.invalidateQueries({ queryKey: ["mod-log"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action impossible"),
  });

  const addWord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("banned_words" as never)
        .insert({ word: word.trim().toLowerCase(), severity } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setWord("");
      void qc.invalidateQueries({ queryKey: ["mod-words"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ajout impossible"),
  });
  const removeWord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("banned_words" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mod-words"] }),
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!isMod)
    return (
      <div className="space-y-2 py-10 text-center">
        <h1 className="font-display text-xl font-semibold">Accès réservé</h1>
        <p className="text-sm text-muted-foreground">
          Cet espace est réservé aux modérateurs de Gabomazone.
        </p>
      </div>
    );

  // Regroupe les signalements par contenu
  const groups = new Map<string, Report[]>();
  for (const r of reports.data ?? []) {
    const k = `${r.target_type}:${r.target_id}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Modération</h1>
      <div className="flex gap-2">
        {(
          [
            ["queue", "Signalements"],
            ["log", "Journal"],
            ["words", "Mots interdits"],
          ] as const
        ).map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "secondary"} onClick={() => setTab(k)}>
            {l}
          </Button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-3">
          {reports.isPending && <Skeleton className="h-24 w-full" />}
          {groups.size === 0 && !reports.isPending && (
            <p className="text-sm text-muted-foreground">Aucun signalement en attente.</p>
          )}
          {[...groups.values()].map((list) => {
            const r = list[0];
            const reasons = [...new Set(list.map((x) => x.reason))].join(", ");
            return (
              <div key={r.id} className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {TYPE_LABEL[r.target_type] ?? r.target_type} · {list.length} signalement
                    {list.length > 1 ? "s" : ""}
                  </p>
                  <TargetLink type={r.target_type} id={r.target_id} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Motifs : {reasons} · {timeAgo(r.created_at)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(r.target_type === "post" || r.target_type === "comment") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ id: r.id, action: "delete" })}
                    >
                      Supprimer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={act.isPending}
                    onClick={() => {
                      const note = window.prompt("Message d'avertissement (facultatif)") ?? undefined;
                      act.mutate({ id: r.id, action: "warn", note });
                    }}
                  >
                    Avertir
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={act.isPending}
                    onClick={() => {
                      const d = Number(window.prompt("Durée de suspension (jours)", "7"));
                      if (d > 0) act.mutate({ id: r.id, action: "suspend", days: d });
                    }}
                  >
                    Suspendre
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: r.id, action: "reject" })}
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-2">
          {(log.data ?? []).map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-3 text-sm">
              <span className="font-semibold">{ACTION_LABEL[a.action] ?? a.action}</span> ·{" "}
              {TYPE_LABEL[a.target_type] ?? a.target_type} · {timeAgo(a.created_at)}
              {a.note ? <p className="text-xs text-muted-foreground">{a.note}</p> : null}
            </div>
          ))}
          {log.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune décision pour l'instant.</p>
          )}
        </div>
      )}

      {tab === "words" && (
        <div className="space-y-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (word.trim()) addWord.mutate();
            }}
          >
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Mot à interdire"
              className="flex-1"
              aria-label="Mot à interdire"
            />
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Gravité"
            >
              <option value="reject">Refuser</option>
              <option value="mask">Masquer le mot</option>
              <option value="review">Publier + revue</option>
            </select>
            <Button type="submit" disabled={addWord.isPending}>
              Ajouter
            </Button>
          </form>
          {(words.data ?? []).map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <span>
                <span className="font-semibold">{w.word}</span> · {SEVERITY_LABEL[w.severity]}
              </span>
              <Button size="sm" variant="ghost" onClick={() => removeWord.mutate(w.id)}>
                Retirer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
