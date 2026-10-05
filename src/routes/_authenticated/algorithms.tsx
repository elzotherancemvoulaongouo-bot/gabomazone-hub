import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAlgorithmSettings, updateAlgorithmSetting, type AlgorithmSetting } from "@/lib/algorithms";
import { useIsModerator } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAutoModLog, reviewAutoMod, appealAutoMod, type AutoModEntry } from "@/lib/auto-moderation";

export const Route = createFileRoute("/_authenticated/algorithms")({
  head: () => ({
    meta: [
      { title: "Centre d'algorithmes — Gabomazone" },
      { name: "description", content: "Réglages des algorithmes de Gabomazone, réservés aux admins." },
      { property: "og:title", content: "Centre d'algorithmes — Gabomazone" },
      { property: "og:description", content: "Panneau admin des algorithmes Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AlgorithmsPage,
});

const TITLES: Record<string, { title: string; text: string }> = {
  feed: {
    title: "Fil d'actualité",
    text: "Trie l'onglet « Pour vous » par score. L'onglet « Récents » reste chronologique.",
  },
  moderation: {
    title: "Modération automatique",
    text: "Score de risque 0-100 sur chaque publication, commentaire et message. Seuil haut : masqué ; seuil moyen : file de validation.",
  },
};

const LABELS: Record<string, string> = {
  freshness: "Fraîcheur (poids)",
  freshness_half_life_hours: "Demi-vie de fraîcheur (heures)",
  reaction: "J'aime",
  comment: "Commentaires",
  share: "Partages",
  friend: "Auteur ami",
  follow: "Auteur suivi",
  community: "Page / groupe suivi",
  interaction: "Interactions passées",
  report_penalty: "Pénalité par signalement",
  spam_penalty: "Pénalité spam probable",
  max_same_author_in_row: "Max. posts de suite du même auteur",
  hide_threshold: "Seuil de masquage auto",
  queue_threshold: "Seuil file de validation",
  banned_word: "Mot interdit",
  many_links: "3 liens ou plus",
  repeated_link: "Même lien répété",
  burst: "Publications en rafale",
  duplicate: "Texte dupliqué",
  shouting: "Majuscules",
  repeat_offender: "Récidive (30 j)",
  cooldown_strikes: "Infractions avant pause (24 h)",
  cooldown_minutes: "Durée de la pause (min)",
};

function AlgorithmsPage() {
  const { user } = Route.useRouteContext();
  const { data: isMod, isPending: checking } = useIsModerator(user.id);
  const { data, isPending } = useAlgorithmSettings();

  if (checking) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (!isMod) return <MyModeration />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Centre d'algorithmes</h1>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        (data ?? []).map((algo) => <AlgoCard key={algo.key} algo={algo} />)
      )}
      <ModQueue />
    </div>
  );
}

function AlgoCard({ algo }: { algo: AlgorithmSetting }) {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState(algo.weights);
  const [saving, setSaving] = useState(false);
  useEffect(() => setWeights(algo.weights), [algo.weights]);
  const info = TITLES[algo.key] ?? { title: algo.key, text: "" };

  async function save(values: Parameters<typeof updateAlgorithmSetting>[1]) {
    setSaving(true);
    try {
      await updateAlgorithmSetting(algo.key, values);
      await queryClient.invalidateQueries({ queryKey: ["algorithm-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["post-scores"] });
      toast.success("Réglages enregistrés");
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 p-4 brand-surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{info.title}</h2>
          <p className="text-xs text-muted-foreground">{info.text}</p>
          <p className="mt-1 text-xs font-medium">{algo.enabled ? "Actif" : "Désactivé"}</p>
        </div>
        <Switch
          checked={algo.enabled}
          disabled={saving}
          aria-label="Activer l'algorithme"
          onCheckedChange={(enabled) => save({ enabled })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(weights).map(([key, value]) => (
          <label key={key} className="space-y-1 text-xs">
            <span className="block text-muted-foreground">{LABELS[key] ?? key}</span>
            <Input
              type="number"
              step="0.5"
              value={value}
              onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <Button className="w-full" disabled={saving} onClick={() => save({ weights })}>
        Enregistrer les poids
      </Button>
    </section>
  );
}

const STATUS: Record<AutoModEntry["status"], string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  restored: "Restauré",
  appealed: "Appel en cours",
};

function EntryHead({ e }: { e: AutoModEntry }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold">
          {e.target_type === "post" ? "Publication" : e.target_type === "comment" ? "Commentaire" : "Message"} ·
          risque {e.score}/100 · {e.decision === "hidden" ? "masqué" : "en file"}
        </span>
        <span className="text-muted-foreground">{STATUS[e.status]}</span>
      </div>
      {e.excerpt ? <p className="line-clamp-3 text-sm">« {e.excerpt} »</p> : null}
      <p className="text-xs text-muted-foreground">Raisons : {e.reasons.join(", ") || "—"}</p>
      {e.appeal_text ? <p className="text-xs">Appel : {e.appeal_text}</p> : null}
    </>
  );
}

/** Admin : file de validation + journal avec annulation. */
function ModQueue() {
  const queryClient = useQueryClient();
  const { data, isPending } = useAutoModLog();
  const [view, setView] = useState<"queue" | "log">("queue");
  const list = (data ?? []).filter((e) =>
    view === "queue" ? e.status === "pending" || e.status === "appealed" : true,
  );

  async function act(id: string, action: "approve" | "reject" | "restore") {
    try {
      await reviewAutoMod(id, action);
      await queryClient.invalidateQueries({ queryKey: ["auto-mod-log"] });
      toast.success("Décision enregistrée");
    } catch {
      toast.error("Action impossible");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 p-4 brand-surface">
      <div className="flex gap-2">
        {(
          [
            ["queue", "File de validation"],
            ["log", "Journal"],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            size="sm"
            variant={view === k ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => setView(k)}
          >
            {label}
          </Button>
        ))}
      </div>
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien à afficher.</p>
      ) : (
        list.map((e) => (
          <div key={e.id} className="space-y-2 rounded-xl border border-border/60 p-3">
            <EntryHead e={e} />
            <div className="flex flex-wrap gap-2">
              {view === "queue" ? (
                <>
                  <Button size="sm" onClick={() => act(e.id, "approve")}>Approuver</Button>
                  <Button size="sm" variant="destructive" onClick={() => act(e.id, "reject")}>Rejeter</Button>
                  {e.decision === "hidden" ? (
                    <Button size="sm" variant="secondary" onClick={() => act(e.id, "restore")}>Restaurer</Button>
                  ) : null}
                </>
              ) : e.status !== "restored" && e.target_type !== "message" ? (
                <Button size="sm" variant="secondary" onClick={() => act(e.id, "restore")}>Annuler</Button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/** Membre : ses contenus modérés automatiquement, avec appel. */
function MyModeration() {
  const { data, isPending } = useAutoModLog();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mes contenus modérés</h1>
      {isPending ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border/70 p-8 text-center brand-surface">
          <p className="text-sm text-muted-foreground">Aucun de vos contenus n'a été modéré.</p>
          <Button asChild className="mt-4">
            <Link to="/feed">Retour à l'accueil</Link>
          </Button>
        </div>
      ) : (
        (data ?? []).map((e) => <AppealCard key={e.id} e={e} />)
      )}
    </div>
  );
}

function AppealCard({ e }: { e: AutoModEntry }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const canAppeal = e.status === "pending" || e.status === "rejected";
  async function send() {
    try {
      await appealAutoMod(e.id, text);
      await queryClient.invalidateQueries({ queryKey: ["auto-mod-log"] });
      toast.success("Appel envoyé à la modération");
    } catch {
      toast.error("Appel impossible");
    }
  }
  return (
    <section className="space-y-2 rounded-2xl border border-border/70 p-4 brand-surface">
      <EntryHead e={e} />
      {canAppeal ? (
        <>
          <Textarea
            placeholder="Expliquez pourquoi ce contenu respecte les règles"
            value={text}
            onChange={(ev) => setText(ev.target.value)}
          />
          <Button size="sm" className="w-full" disabled={!text.trim()} onClick={send}>
            Faire appel
          </Button>
        </>
      ) : null}
    </section>
  );
}
