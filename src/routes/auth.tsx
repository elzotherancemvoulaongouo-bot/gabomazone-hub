import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Gabomazone" },
      {
        name: "description",
        content:
          "Connectez-vous ou créez votre compte Gabomazone pour partager vos photos, vidéos et commentaires.",
      },
      { property: "og:title", content: "Connexion — Gabomazone" },
      {
        property: "og:description",
        content: "Rejoignez Gabomazone, le réseau social des photos et vidéos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    setErrorMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/feed", replace: true });
        } else {
          setNotice(
            "Compte créé. Ouvrez l'e-mail de confirmation envoyé à " +
              email +
              " puis revenez vous connecter. Sans cette confirmation, l'accès reste bloqué.",
          );
          toast.success("Compte créé", {
            description: "Vérifiez votre e-mail pour confirmer votre inscription.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/feed", replace: true });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Une erreur est survenue";
      const message = raw.includes("weak")
        ? "Ce mot de passe est trop courant. Choisissez-en un plus original (12+ caractères)."
        : raw === "Invalid login credentials"
          ? "E-mail ou mot de passe incorrect."
          : raw === "Email not confirmed"
            ? "E-mail non confirmé : cliquez sur le lien reçu par e-mail avant de vous connecter."
            : raw;
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/feed", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-3xl font-bold brand-text">
          gabomazone
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Partagez vos photos, vidéos et moments avec la communauté.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-border/70 p-5 brand-surface">
          {notice && (
            <p className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
              {notice}
            </p>
          )}
          {errorMsg && (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
              {errorMsg}
            </p>
          )}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="username">Pseudo</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mongabon"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle}>
            {mode === "signin" ? "Se connecter avec Google" : "S'inscrire avec Google"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {mode === "signin"
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà membre ? Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}