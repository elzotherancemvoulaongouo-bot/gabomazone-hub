import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Accessibility,
  Ban,
  Bell,
  Bookmark,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  History,
  Image as ImageIcon,
  LogOut,
  Newspaper,
  Palette,
  ShieldCheck,
  UserCircle,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

const ICONS = {
  "user-circle": UserCircle,
  "user-cog": UserCog,
  shield: ShieldCheck,
  eye: Eye,
  bell: Bell,
  newspaper: Newspaper,
  image: ImageIcon,
  globe: Globe,
  palette: Palette,
  accessibility: Accessibility,
  ban: Ban,
  history: History,
  bookmark: Bookmark,
  help: HelpCircle,
  file: FileText,
} as const;

export const Route = createFileRoute("/_authenticated/settings/")({
  head: () => ({
    meta: [
      { title: "Paramètres du profil — Gabomazone" },
      {
        name: "description",
        content:
          "Modifiez votre photo, votre nom, votre âge, votre pays, votre ville et vos contacts sur Gabomazone.",
      },
      { property: "og:title", content: "Paramètres du profil — Gabomazone" },
      { property: "og:description", content: "Personnalisez votre profil Gabomazone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsHub,
});

function SettingsHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const groups = [
    { title: "Compte", keys: ["profile", "security", "activity"] },
    { title: "Confidentialité", keys: ["privacy", "contact", "blocks"] },
    { title: "Préférences", keys: ["notifications", "feed", "media", "language", "saved"] },
    { title: "Affichage", keys: ["appearance", "accessibility"] },
    { title: "Assistance", keys: ["help", "legal"] },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Paramètres</h1>

      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">{group.title}</h2>
          <div className="overflow-hidden rounded-2xl border border-border/70 brand-surface">
            {group.keys.map((key) => {
              const section = SETTINGS_SECTIONS[key];
              if (!section) return null;
              const Icon = ICONS[section.icon as keyof typeof ICONS] ?? UserCircle;
              return (
                <Link
                  key={key}
                  to="/settings/$section"
                  params={{ section: key }}
                  className="flex min-h-14 items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0 hover:bg-secondary/60"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                    <Icon className="size-5 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{section.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <Button variant="secondary" className="h-12 w-full" onClick={signOut}>
        <LogOut className="mr-2 size-5" /> Déconnexion
      </Button>
    </div>
  );
}
