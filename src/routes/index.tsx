import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Camera, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gabomazone — Réseau social photo & vidéo" },
      {
        name: "description",
        content:
          "Gabomazone : partagez vos photos et vidéos, likez et commentez les publications de la communauté.",
      },
      { property: "og:title", content: "Gabomazone — Réseau social photo & vidéo" },
      {
        property: "og:description",
        content: "Partagez vos photos et vidéos avec la communauté Gabomazone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Camera, title: "Photos & vidéos", text: "Publiez vos moments en un instant." },
  { icon: Heart, title: "J'aime", text: "Soutenez les créateurs que vous suivez." },
  { icon: MessageCircle, title: "Commentaires", text: "Lancez la conversation." },
];

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Réseau social</p>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight brand-text">gabomazone</h1>
      <p className="mt-4 text-base text-muted-foreground">
        Partagez vos photos et vidéos, likez et commentez les publications de la communauté.
      </p>

      <div className="mt-8 flex gap-3">
        <Button asChild size="lg">
          <Link to="/auth">Commencer</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </div>

      <ul className="mt-12 space-y-3">
        {features.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-border/70 p-4 brand-surface"
          >
            <Icon className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
