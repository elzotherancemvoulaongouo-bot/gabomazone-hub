import { createFileRoute } from "@tanstack/react-router";
import { CommunitySuggestions, PeopleSuggestions } from "@/components/Suggestions";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Découvrir — Gabomazone" },
      { name: "description", content: "Personnes, groupes et pages suggérés pour vous sur Gabomazone." },
      { property: "og:title", content: "Découvrir — Gabomazone" },
      { property: "og:description", content: "Suggestions d'amis, de groupes et de pages sur Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Découvrir</h1>
      <section className="space-y-3">
        <h2 className="font-semibold">Personnes que vous pourriez connaître</h2>
        <PeopleSuggestions limit={12} />
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Groupes et pages pour vous</h2>
        <CommunitySuggestions limit={12} />
      </section>
    </div>
  );
}
