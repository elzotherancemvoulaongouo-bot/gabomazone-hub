import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";
import { useSettings, useUpdateSettings, type UserSettings } from "@/lib/settings";
import { useBlockActions, useBlockedUsers } from "@/lib/social";
import { POST_SELECT } from "@/lib/posts";
import type { FeedPost } from "@/components/PostCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/$section")({
  head: () => ({
    meta: [
      { title: "Paramètres — Gabomazone" },
      { name: "description", content: "Gérez votre compte, votre confidentialité et vos préférences Gabomazone." },
      { property: "og:title", content: "Paramètres — Gabomazone" },
      { property: "og:description", content: "Compte, confidentialité, notifications et apparence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const { user } = Route.useRouteContext();
  const meta = SETTINGS_SECTIONS[section];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Retour aux paramètres">
          <Link to="/settings">
            <ChevronLeft className="size-6" />
          </Link>
        </Button>
        <h1 className="font-display text-xl font-bold">{meta?.title ?? "Paramètres"}</h1>
      </div>
      <Panel section={section} userId={user.id} email={user.email ?? ""} />
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border/50 px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border/70 brand-surface">{children}</div>;
}

function Choices<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-full border border-border/70 px-3 text-xs",
            value === o.value && "border-primary text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={title} className="overflow-hidden rounded-2xl border border-border/70 brand-surface">
      <AccordionTrigger className="px-4 text-sm font-semibold hover:no-underline">{title}</AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="border-t border-border/50">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Groups({ children, first }: { children: React.ReactNode; first: string }) {
  return (
    <Accordion type="multiple" defaultValue={[first]} className="space-y-3">
      {children}
    </Accordion>
  );
}

function Panel({ section, userId, email }: { section: string; userId: string; email: string }) {
  const { data: settings, isPending } = useSettings(userId);
  const update = useUpdateSettings(userId);
  const set = (patch: Partial<Omit<UserSettings, "user_id">>) => update.mutate(patch);

  if (section === "profile") return <ProfileSettingsForm userId={userId} />;
  if (section === "blocks") return <BlocksPanel userId={userId} />;
  if (section === "saved") return <SavedPanel userId={userId} />;
  if (section === "activity") return <ActivityPanel userId={userId} />;
  if (section === "support" || section === "help") return <SupportPanel />;
  if (section === "legal") return <LegalPanel />;

  if (isPending || !settings) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (section === "account") return <AccountPanel email={email} userId={userId} />;
  if (section === "security") return <SecurityPanel email={email} settings={settings} set={set} />;
  if (section === "moderation") return <ModerationPanel settings={settings} set={set} />;

  if (section === "privacy") {
    return (
      <Groups first="Publications">
        <Group title="Publications">
          <Row label="Visibilité par défaut" hint="Appliquée à vos nouvelles publications">
            <Choices
              value={settings.post_visibility}
              onChange={(v) => set({ post_visibility: v })}
              options={[
                { value: "public", label: "Public" },
                { value: "friends", label: "Amis" },
                { value: "only_me", label: "Privé" },
              ]}
            />
          </Row>
          <Row label="Qui peut commenter mes publications">
            <Choices
              value={settings.who_can_comment}
              onChange={(v) => set({ who_can_comment: v })}
              options={[
                { value: "everyone", label: "Tout le monde" },
                { value: "friends", label: "Amis" },
              ]}
            />
          </Row>
        </Group>
        <Group title="Relations">
          <Row label="Qui peut m'envoyer une demande d'ami">
            <Choices
              value={settings.who_can_friend_request}
              onChange={(v) => set({ who_can_friend_request: v })}
              options={[
                { value: "everyone", label: "Tout le monde" },
                { value: "friends_of_friends", label: "Amis d'amis" },
                { value: "nobody", label: "Personne" },
              ]}
            />
          </Row>
          <Row label="Qui peut m'envoyer un message">
            <Choices
              value={settings.who_can_message}
              onChange={(v) => set({ who_can_message: v })}
              options={[
                { value: "everyone", label: "Tout le monde" },
                { value: "friends", label: "Amis" },
              ]}
            />
          </Row>
          <Row label="Visibilité de ma liste d'amis">
            <Choices
              value={settings.friend_list_visibility}
              onChange={(v) => set({ friend_list_visibility: v })}
              options={[
                { value: "public", label: "Public" },
                { value: "friends", label: "Amis" },
                { value: "only_me", label: "Moi" },
              ]}
            />
          </Row>
        </Group>
        <Group title="Personnes bloquées">
          <BlocksPanel userId={userId} flush />
        </Group>
      </Groups>
    );
  }

  if (section === "notifications") {
    return (
      <Groups first="Canaux">
        <Group title="Canaux">
          <Row label="Notifications push" hint="Sur cet appareil">
            <Switch checked={settings.notif_push} onCheckedChange={(v) => set({ notif_push: v })} />
          </Row>
          <Row label="Notifications par e-mail" hint={email}>
            <Switch checked={settings.notif_email} onCheckedChange={(v) => set({ notif_email: v })} />
          </Row>
        </Group>
        <Group title="Par catégorie">
          <Row label="Nouveaux messages">
            <Switch checked={settings.notif_messages} onCheckedChange={(v) => set({ notif_messages: v })} />
          </Row>
          <Row label="Commentaires">
            <Switch checked={settings.notif_comments} onCheckedChange={(v) => set({ notif_comments: v })} />
          </Row>
          <Row label="Mentions">
            <Switch checked={settings.notif_mentions} onCheckedChange={(v) => set({ notif_mentions: v })} />
          </Row>
          <Row label="Groupes et pages">
            <Switch checked={settings.notif_groups} onCheckedChange={(v) => set({ notif_groups: v })} />
          </Row>
          <Row label="Amis" hint="Demandes envoyées et acceptées">
            <Switch checked={settings.notif_friends} onCheckedChange={(v) => set({ notif_friends: v })} />
          </Row>
          <Row label="J'aime">
            <Switch checked={settings.notif_likes} onCheckedChange={(v) => set({ notif_likes: v })} />
          </Row>
        </Group>
      </Groups>
    );
  }

  if (section === "personalization" || section === "appearance" || section === "language") {
    return (
      <Groups first="Apparence">
        <Group title="Apparence">
          <Row label="Mode d'affichage">
            <Choices
              value={settings.theme}
              onChange={(v) => set({ theme: v })}
              options={[
                { value: "dark", label: "Sombre" },
                { value: "light", label: "Clair" },
                { value: "system", label: "Système" },
              ]}
            />
          </Row>
          <Row label="Taille du texte">
            <Choices
              value={settings.font_size}
              onChange={(v) => set({ font_size: v })}
              options={[
                { value: "small", label: "Petit" },
                { value: "normal", label: "Normal" },
                { value: "large", label: "Grand" },
              ]}
            />
          </Row>
        </Group>
        <Group title="Langue">
          <Row label="Langue de l'interface">
            <Choices
              value={settings.language}
              onChange={(v) => set({ language: v })}
              options={[
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
            />
          </Row>
        </Group>
        <Group title="Accessibilité">
          <Row label="Réduire les animations">
            <Switch checked={settings.reduce_motion} onCheckedChange={(v) => set({ reduce_motion: v })} />
          </Row>
          <Row label="Contraste élevé">
            <Switch checked={settings.high_contrast} onCheckedChange={(v) => set({ high_contrast: v })} />
          </Row>
        </Group>
      </Groups>
    );
  }

  if (section === "feed") {
    return (
      <Groups first="Ordre du fil">
        <Group title="Ordre du fil">
          <Row label="Type de fil">
            <Choices
              value={settings.feed_algorithm}
              onChange={(v) => set({ feed_algorithm: v })}
              options={[
                { value: "chronological", label: "Chronologique" },
                { value: "personalized", label: "Personnalisé" },
              ]}
            />
          </Row>
          <Row label="Amis et pages prioritaires" hint="Afficher d'abord vos amis">
            <Choices
              value={settings.feed_sort}
              onChange={(v) => set({ feed_sort: v })}
              options={[
                { value: "recent", label: "Non" },
                { value: "friends_first", label: "Oui" },
              ]}
            />
          </Row>
        </Group>
        <Group title="Contenus masqués">
          <HiddenPostsPanel userId={userId} />
        </Group>
        <Group title="Médias">
          <Row label="Lecture automatique des vidéos">
            <Switch checked={settings.autoplay_videos} onCheckedChange={(v) => set({ autoplay_videos: v })} />
          </Row>
          <Row label="Économiseur de données" hint="Charge les médias en qualité réduite">
            <Switch checked={settings.data_saver} onCheckedChange={(v) => set({ data_saver: v })} />
          </Row>
        </Group>
      </Groups>
    );
  }

  if (section === "contact") {
    return (
      <Card>
        <Row label="Qui peut m'envoyer un message">
          <Choices
            value={settings.who_can_message}
            onChange={(v) => set({ who_can_message: v })}
            options={[
              { value: "everyone", label: "Tout le monde" },
              { value: "friends", label: "Amis" },
            ]}
          />
        </Row>
      </Card>
    );
  }

  if (section === "media") {
    return (
      <Card>
        <Row label="Lecture automatique des vidéos">
          <Switch checked={settings.autoplay_videos} onCheckedChange={(v) => set({ autoplay_videos: v })} />
        </Row>
        <Row label="Économiseur de données">
          <Switch checked={settings.data_saver} onCheckedChange={(v) => set({ data_saver: v })} />
        </Row>
      </Card>
    );
  }

  if (section === "accessibility") {
    return (
      <Card>
        <Row label="Réduire les animations">
          <Switch checked={settings.reduce_motion} onCheckedChange={(v) => set({ reduce_motion: v })} />
        </Row>
        <Row label="Contraste élevé">
          <Switch checked={settings.high_contrast} onCheckedChange={(v) => set({ high_contrast: v })} />
        </Row>
      </Card>
    );
  }

  return <p className="text-sm text-muted-foreground">Section introuvable.</p>;
}

function AccountPanel({ email, userId }: { email: string; userId: string }) {
  const [newEmail, setNewEmail] = useState(email);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["profile-brief", "settings-account", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, phone")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setUsername(data.username ?? "");
        setPhone(data.phone ?? "");
      }
      return data;
    },
  });

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Un e-mail de confirmation vous a été envoyé.");
  }

  async function saveProfileFields(e: React.FormEvent) {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (clean.length < 3) {
      toast.error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: clean, phone: phone.trim() || null })
      .eq("id", userId);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Compte mis à jour");
  }

  async function exportData() {
    const [profileRes, posts, comments] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId),
      supabase.from("comments").select("*").eq("user_id", userId),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      profile: profileRes.data,
      posts: posts.data ?? [],
      comments: comments.data ?? [],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gabomazone-donnees.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  }

  return (
    <Groups first="Identifiants">
      <Group title="Identifiants">
        <form onSubmit={saveEmail} className="space-y-3 p-4">
          <Label htmlFor="account-email">Adresse e-mail</Label>
          <Input
            id="account-email"
            type="email"
            className="h-11"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            Mettre à jour l'e-mail
          </Button>
        </form>
        <form onSubmit={saveProfileFields} className="space-y-3 border-t border-border/50 p-4">
          <Label htmlFor="account-username">Nom d'utilisateur</Label>
          <Input
            id="account-username"
            className="h-11"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={profile?.username ?? "pseudo"}
          />
          <Label htmlFor="account-phone">Téléphone</Label>
          <Input
            id="account-phone"
            className="h-11"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+241 ..."
          />
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            Enregistrer
          </Button>
        </form>
      </Group>
      <Group title="Mot de passe">
        <PasswordForm />
      </Group>
      <Group title="Mes données">
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Téléchargez une copie de votre profil, de vos publications et de vos commentaires.
          </p>
          <Button variant="secondary" className="h-11 w-full" onClick={exportData}>
            Exporter mes données
          </Button>
        </div>
      </Group>
      <Group title="Désactivation et suppression">
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            La désactivation masque votre profil jusqu'à votre prochaine connexion. La suppression est
            définitive et efface vos publications.
          </p>
          <Button
            variant="secondary"
            className="h-11 w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Compte désactivé — reconnectez-vous pour le réactiver.");
              window.location.href = "/auth";
            }}
          >
            Désactiver mon compte
          </Button>
          <Button
            variant="destructive"
            className="h-11 w-full"
            onClick={async () => {
              if (!window.confirm("Supprimer définitivement vos publications et votre profil ?")) return;
              const { error } = await supabase.from("posts").delete().eq("user_id", userId);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Contenus supprimés. Contactez le support pour effacer le compte.");
            }}
          >
            Supprimer mon contenu
          </Button>
        </div>
      </Group>
    </Groups>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Mot de passe mis à jour");
    }
  }

  return (
    <form onSubmit={changePassword} className="space-y-3 p-4">
      <Label htmlFor="new-password">Nouveau mot de passe</Label>
      <Input
        id="new-password"
        type="password"
        className="h-11"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Au moins 8 caractères"
      />
      <Button type="submit" className="h-11 w-full" disabled={busy}>
        {busy ? "Mise à jour…" : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  );
}

function SecurityPanel({
  email,
  settings,
  set,
}: {
  email: string;
  settings: UserSettings;
  set: (patch: Partial<Omit<UserSettings, "user_id">>) => void;
}) {
  const [session, setSession] = useState<{ at?: string; agent: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession({
        at: data.session?.user.last_sign_in_at ?? undefined,
        agent: typeof navigator === "undefined" ? "Appareil" : navigator.userAgent,
      });
    });
  }, []);

  return (
    <Groups first="Authentification à deux facteurs">
      <Group title="Authentification à deux facteurs">
        <Row label="Vérification en deux étapes" hint={`Code envoyé à ${email}`}>
          <Switch
            checked={settings.two_factor_enabled}
            onCheckedChange={(v) => {
              set({ two_factor_enabled: v });
              toast.success(v ? "Double authentification activée" : "Double authentification désactivée");
            }}
          />
        </Row>
      </Group>
      <Group title="Appareils connectés">
        <Row label="Cet appareil" hint={session?.agent.slice(0, 60)}>
          <span className="text-xs text-primary">Actif</span>
        </Row>
        <div className="p-4">
          <Button
            variant="secondary"
            className="h-11 w-full"
            onClick={async () => {
              await supabase.auth.signOut({ scope: "others" });
              toast.success("Déconnexion des autres appareils effectuée");
            }}
          >
            Déconnecter les autres appareils
          </Button>
        </div>
      </Group>
      <Group title="Historique de connexion">
        <Row
          label="Dernière connexion"
          hint={session?.at ? new Date(session.at).toLocaleString("fr-FR") : "—"}
        >
          <span />
        </Row>
        <Row label="Compte" hint={email}>
          <span />
        </Row>
      </Group>
    </Groups>
  );
}

function ModerationPanel({
  settings,
  set,
}: {
  settings: UserSettings;
  set: (patch: Partial<Omit<UserSettings, "user_id">>) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [report, setReport] = useState("");
  const keywords = settings.muted_keywords ?? [];

  return (
    <Groups first="Mots-clés filtrés">
      <Group title="Mots-clés filtrés">
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Les publications contenant ces mots seront masquées de votre fil.
          </p>
          <div className="flex gap-2">
            <Input
              className="h-11"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ajouter un mot-clé"
            />
            <Button
              className="h-11"
              onClick={() => {
                const k = keyword.trim().toLowerCase();
                if (!k || keywords.includes(k)) return;
                set({ muted_keywords: [...keywords, k] });
                setKeyword("");
              }}
            >
              Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun mot-clé filtré.</p>
            ) : (
              keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ muted_keywords: keywords.filter((x) => x !== k) })}
                  className="rounded-full border border-border/70 px-3 py-1 text-xs hover:border-destructive hover:text-destructive"
                >
                  {k} ✕
                </button>
              ))
            )}
          </div>
        </div>
      </Group>
      <Group title="Signaler un problème">
        <div className="space-y-3 p-4">
          <Textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="Décrivez le problème rencontré"
            className="min-h-24"
          />
          <Button
            className="h-11 w-full"
            onClick={() => {
              if (report.trim().length < 10) {
                toast.error("Merci de décrire le problème en quelques mots.");
                return;
              }
              setReport("");
              toast.success("Signalement envoyé à l'équipe Gabomazone.");
            }}
          >
            Envoyer le signalement
          </Button>
        </div>
      </Group>
    </Groups>
  );
}

function HiddenPostsPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["hidden-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hidden_posts")
        .select("post_id, post:posts(caption)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as { post_id: string; post: { caption: string | null } | null }[];
    },
  });

  if (isPending) return <div className="p-4"><Skeleton className="h-16 w-full rounded-xl" /></div>;
  if (!data || data.length === 0)
    return <p className="p-4 text-sm text-muted-foreground">Aucun contenu masqué.</p>;

  return (
    <>
      {data.map((row) => (
        <Row key={row.post_id} label={row.post?.caption?.slice(0, 60) || "Publication masquée"}>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await supabase.from("hidden_posts").delete().eq("user_id", userId).eq("post_id", row.post_id);
              queryClient.invalidateQueries({ queryKey: ["hidden-posts", userId] });
              queryClient.invalidateQueries({ queryKey: ["feed"] });
            }}
          >
            Réafficher
          </Button>
        </Row>
      ))}
    </>
  );
}

function BlocksPanel({ userId }: { userId: string }) {
  const { data, isPending } = useBlockedUsers(userId);
  const { unblock } = useBlockActions(userId);

  if (isPending) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">Vous n'avez bloqué personne.</p>;

  return (
    <Card>
      {data.map((row) => (
        <Row key={row.blocked_id} label={row.profile?.display_name || row.profile?.username || "Membre"}>
          <div className="flex items-center gap-2">
            <UserAvatar avatarPath={row.profile?.avatar_url} name={row.profile?.username} />
            <Button size="sm" variant="secondary" onClick={() => unblock.mutate(row.blocked_id)}>
              Débloquer
            </Button>
          </div>
        </Row>
      ))}
    </Card>
  );
}

function SavedPanel({ userId }: { userId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ["saved-posts-full", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select(`post:posts(${POST_SELECT})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => (r as unknown as { post: FeedPost | null }).post)
        .filter(Boolean) as FeedPost[];
    },
  });

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">Aucune publication enregistrée.</p>;
  return (
    <div className="space-y-4">
      {data.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={userId} />
      ))}
    </div>
  );
}

function ActivityPanel({ userId }: { userId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ["account-activity", userId],
    queryFn: async () => {
      const [posts, likes, comments, friends] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("likes").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted"),
      ]);
      return {
        posts: posts.count ?? 0,
        likes: likes.count ?? 0,
        comments: comments.count ?? 0,
        friends: friends.count ?? 0,
      };
    },
  });

  if (isPending || !data) return <Skeleton className="h-32 w-full rounded-2xl" />;
  return (
    <Card>
      <Row label="Publications">{data.posts}</Row>
      <Row label="J'aime donnés">{data.likes}</Row>
      <Row label="Commentaires">{data.comments}</Row>
      <Row label="Amis">{data.friends}</Row>
    </Card>
  );
}

function HelpPanel() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4 text-sm leading-relaxed">
      <p className="font-medium">Besoin d'aide ?</p>
      <p className="text-muted-foreground">
        Publiez du texte, des photos ou des vidéos depuis l'accueil, discutez en privé avec vos amis et
        rejoignez des pages ou des groupes. Pour signaler un problème ou un contenu, utilisez le menu « … »
        d'une publication.
      </p>
      <p className="text-muted-foreground">Contact : support@gabomazone.app</p>
    </div>
  );
}

function LegalPanel() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4 text-sm leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">Conditions d'utilisation</p>
      <p>
        En utilisant Gabomazone, vous vous engagez à publier des contenus respectueux, à ne pas usurper
        l'identité d'autrui et à respecter les droits des autres membres.
      </p>
      <p className="font-medium text-foreground">Confidentialité</p>
      <p>
        Vos données (profil, publications, messages) sont stockées de manière sécurisée et ne sont visibles
        que selon les réglages de confidentialité que vous choisissez. Vous pouvez modifier ou supprimer vos
        publications à tout moment.
      </p>
    </div>
  );
}