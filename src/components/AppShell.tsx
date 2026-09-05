import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Settings,
  Store,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useApplyAppearance, useSettings } from "@/lib/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useNotificationsRealtime,
  useUnreadCountByType,
  useUnreadNotificationsCount,
} from "@/lib/notifications";

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
  const { user } = useAuth();
  useNotificationsRealtime(user?.id);
  const unread = useUnreadNotificationsCount(Boolean(user));
  const unreadMessages = useUnreadCountByType("message", Boolean(user));
  const { data: settings } = useSettings(user?.id);
  useApplyAppearance(settings);
  const [search, setSearch] = useState("");
  const { data: profile } = useQuery({
    queryKey: ["profile-brief", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user?.id),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto grid h-14 w-full max-w-2xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3">
          <Link to="/feed" className="shrink-0 font-display text-xl font-bold brand-text">
            gabomazone
          </Link>

          <form
            className="relative min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/explore", search: { q: search.trim() } });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher sur Gabomazone"
              className="h-10 rounded-full pl-9"
            />
          </form>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Link to="/notifications">
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Messages" className="relative">
              <Link to="/messages">
                <MessageCircle className="size-5" />
                {unreadMessages > 0 ? (
                  <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Paramètres">
              <Link to="/settings">
                <Settings className="size-5" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu du compte">
                  <UserAvatar
                    avatarPath={profile?.avatar_url}
                    name={profile?.username ?? undefined}
                    className="size-7 ring-1 ring-primary/40"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/me">
                    <User className="mr-2 size-4" /> Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/$section" params={{ section: "saved" }}>
                    <Bookmark className="mr-2 size-4" /> Publications enregistrées
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/pages">
                    <Store className="mr-2 size-4" /> Pages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/groups">
                    <UsersRound className="mr-2 size-4" /> Groupes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut className="mr-2 size-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-around px-4 py-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const badge = to === "/messages" ? unreadMessages : 0;
            return (
              <Link
                key={to}
                to={to}
                aria-label={badge > 0 ? `${label} (${badge} non lus)` : label}
                className="relative flex min-w-12 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] text-muted-foreground transition-colors"
                activeProps={{ className: "text-primary" }}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {badge > 0 ? (
                    <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}