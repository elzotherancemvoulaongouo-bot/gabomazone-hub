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
};

function AlgorithmsPage() {
  const { user } = Route.useRouteContext();
  const { data: isMod, isPending: checking } = useIsModerator(user.id);
  const { data, isPending } = useAlgorithmSettings();

  if (checking) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (!isMod)
    return (
      <div className="rounded-2xl border border-border/70 p-8 text-center brand-surface">
        <p className="text-sm text-muted-foreground">Accès réservé aux administrateurs.</p>
        <Button asChild className="mt-4">
          <Link to="/feed">Retour à l'accueil</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Centre d'algorithmes</h1>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        (data ?? []).map((algo) => <AlgoCard key={algo.key} algo={algo} />)
      )}
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
