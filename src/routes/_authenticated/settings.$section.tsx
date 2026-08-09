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

function Panel({ section, userId, email }: { section: string; userId: string; email: string }) {
  const { data: settings, isPending } = useSettings(userId);
  const update = useUpdateSettings(userId);
  const set = (patch: Partial<Omit<UserSettings, "user_id">>) => update.mutate(patch);

  if (section === "profile") return <ProfileSettingsForm userId={userId} />;
  if (section === "security") return <SecurityPanel email={email} />;
  if (section === "blocks") return <BlocksPanel userId={userId} />;
  if (section === "saved") return <SavedPanel userId={userId} />;
  if (section === "activity") return <ActivityPanel userId={userId} />;
  if (section === "help") return <HelpPanel />;
  if (section === "legal") return <LegalPanel />;

  if (isPending || !settings) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (section === "privacy") {
    return (
      <Card>
        <Row label="Visibilité par défaut" hint="Appliquée à vos nouvelles publications">
          <Choices
            value={settings.post_visibility}
            onChange={(v) => set({ post_visibility: v })}
            options={[
              { value: "public", label: "Public" },
              { value: "friends", label: "Amis" },
              { value: "only_me", label: "Moi" },
            ]}
          />
        </Row>
      </Card>
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
        <Row label="Demandes d'amis">
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
      </Card>
    );
  }

  if (section === "notifications") {
    return (
      <Card>
        <Row label="Nouveaux messages">
          <Switch checked={settings.notif_messages} onCheckedChange={(v) => set({ notif_messages: v })} />
        </Row>
        <Row label="J'aime">
          <Switch checked={settings.notif_likes} onCheckedChange={(v) => set({ notif_likes: v })} />
        </Row>
        <Row label="Commentaires">
          <Switch checked={settings.notif_comments} onCheckedChange={(v) => set({ notif_comments: v })} />
        </Row>
        <Row label="Demandes d'amis acceptées">
          <Switch checked={settings.notif_friends} onCheckedChange={(v) => set({ notif_friends: v })} />
        </Row>
      </Card>
    );
  }

  if (section === "feed") {
    return (
      <Card>
        <Row label="Ordre du fil">
          <Choices
            value={settings.feed_sort}
            onChange={(v) => set({ feed_sort: v })}
            options={[
              { value: "recent", label: "Plus récentes" },
              { value: "friends_first", label: "Amis d'abord" },
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
        <Row label="Économiseur de données" hint="Charge les médias en qualité réduite">
          <Switch checked={settings.data_saver} onCheckedChange={(v) => set({ data_saver: v })} />
        </Row>
      </Card>
    );
  }

  if (section === "language") {
    return (
      <Card>
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
      </Card>
    );
  }

  if (section === "appearance") {
    return (
      <Card>
        <Row label="Thème">
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

function SecurityPanel({ email }: { email: string }) {
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
    <div className="space-y-4">
      <Card>
        <Row label="Adresse e-mail" hint={email}>
          <span />
        </Row>
      </Card>
      <form onSubmit={changePassword} className="space-y-3 rounded-2xl border border-border/70 brand-surface p-4">
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