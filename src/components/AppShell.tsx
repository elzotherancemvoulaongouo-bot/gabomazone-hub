import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Home, LogOut, MessageCircle, PlusSquare, Settings, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/feed", label: "Accueil", icon: Home },
  { to: "/explore", label: "Explorer", icon: Compass },
  { to: "/create", label: "Publier", icon: PlusSquare },
  { to: "/friends", label: "Amis", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/me", label: "Profil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <Link to="/feed" className="font-display text-xl font-bold brand-text">
            gabomazone
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Paramètres du profil">
              <Link to="/settings">
                <Settings className="size-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-around px-4 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}