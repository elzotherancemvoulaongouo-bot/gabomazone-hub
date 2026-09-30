import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/regles")({
  head: () => ({
    meta: [
      { title: "Règles de la communauté et modération — Gabomazone" },
      {
        name: "description",
        content:
          "Contenus interdits, signalement, blocage et modération sur Gabomazone : nos règles pour une communauté sûre.",
      },
      { property: "og:title", content: "Règles de la communauté — Gabomazone" },
      {
        property: "og:description",
        content: "Comment Gabomazone modère les contenus et protège ses membres.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-10 text-sm leading-relaxed">
      <Link to="/" className="font-display text-2xl font-bold brand-text">
        gabomazone
      </Link>
      <h1 className="text-2xl font-bold">Règles de la communauté et politique de modération</h1>
      <p className="text-muted-foreground">
        En utilisant Gabomazone, vous acceptez ces règles. Tolérance zéro pour les contenus
        répréhensibles et les comportements abusifs.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contenus interdits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Exploitation ou mise en danger d'enfants, sous quelque forme que ce soit.</li>
          <li>Nudité, contenu sexuel explicite ou pornographique.</li>
          <li>Harcèlement, intimidation, menaces ou discours haineux.</li>
          <li>Violence gratuite, terrorisme, incitation à se faire du mal.</li>
          <li>Arnaques, spam, faux comptes et usurpation d'identité.</li>
          <li>Vente de produits illégaux, drogues ou armes.</li>
          <li>Publication d'informations privées d'autrui sans accord.</li>
          <li>Violation des droits d'auteur.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Signaler</h2>
        <p>
          Touchez « … » sur une publication, un profil, une page ou un groupe, puis « Signaler ».
          Les signalements sont confidentiels : la personne signalée ne sait pas qui l'a signalée.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Bloquer et masquer</h2>
        <p>
          Vous pouvez bloquer un membre depuis son profil ou depuis ses publications : ses contenus
          disparaissent de votre fil. Vous pouvez aussi masquer une publication. Gérez vos blocages
          dans Paramètres › Confidentialité.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Modération</h2>
        <p>
          Notre équipe examine les signalements sous 24 heures. Un contenu contraire à ces règles
          est supprimé, et son auteur peut être averti, suspendu ou exclu définitivement. Les
          contenus illégaux peuvent être transmis aux autorités.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Pour toute question ou contestation, utilisez « Signaler un problème » dans les
          Paramètres.
        </p>
      </section>
    </main>
  );
}
