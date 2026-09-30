import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Bookmark, CalendarDays, ChevronDown, CircleHelp, Compass, Home, LogOut, Menu, MessageCircle, Play, PlusSquare, Search, Settings, Store, User, Users, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useApplyAppearance, useSettings } from "@/lib/settings";
import { MAIN_SECTIONS } from "@/lib/settings-sections";
import { useNotificationsRealtime, useUnreadMessagesCount, useUnreadNotificationsCount } from "@/lib/notifications";

const navItems = [
  { to: "/feed", label: "Accueil", icon: Home },
  { to: "/explore", label: "Explorer", icon: Compass },
  { to: "/create", label: "Publier", icon: PlusSquare },
  { to: "/friends", label: "Amis", icon: Users },
  { to: "/me", label: "Profil", icon: User },
] as const;

const shortcuts = [
  { to: "/groups", label: "Groupes", icon: UsersRound },
  { to: "/pages", label: "Pages", icon: Store },
  { to: "/friends", label: "Amis", icon: Users },
  { to: "/videos", label: "Vidéos", icon: Play },
  { to: "/events", label: "Événements", icon: CalendarDays },
] as const;

const HISTORY_KEY = "gabomazone-recent-searches";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useNotificationsRealtime(user?.id);
  const unread = useUnreadNotificationsCount(Boolean(user));
  const unreadMessages = useUnreadMessagesCount(user?.id);
  const { data: settings } = useSettings(user?.id);
  useApplyAppearance(settings);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useQuery({
    queryKey: ["profile-brief", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles")
        .select("username, display_name, avatar_url").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user?.id),
  });
  const { data: suggestions } = useQuery({
    queryKey: ["header-suggestions", search.trim()],
    enabled: searchOpen && search.trim().length > 1,
    queryFn: async () => {
      const term = `%${search.trim().replace(/[%,()]/g, "")}%`;
      const [people, groups, pages] = await Promise.all([
        supabase.from("profiles").select("username, display_name").or(`username.ilike.${term},display_name.ilike.${term}`).limit(3),
        supabase.from("groups").select("slug, name").ilike("name", term).limit(2),
        supabase.from("pages").select("slug, name").ilike("name", term).limit(2),
      ]);
      return [
        ...(people.data ?? []).map((p) => ({ label: p.display_name || p.username, detail: "Personne" })),
        ...(groups.data ?? []).map((g) => ({ label: g.name, detail: "Groupe" })),
        ...(pages.data ?? []).map((p) => ({ label: p.name, detail: "Page" })),
      ];
    },
  });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(stored)) setRecent(stored.filter((v): v is string => typeof v === "string").slice(0, 6));
    } catch { /* Ignore malformed browser history. */ }
  }, []);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const term = search.trim();
    if (!term) return;
    const next = [term, ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setSearchOpen(false);
    inputRef.current?.blur();
    navigate({ to: "/explore", search: { q: term } });
  }

  async function signOut() {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-1 px-2 sm:px-3">
          {searchOpen ? (
            <form className="flex w-full min-w-0 items-center gap-1" onSubmit={submitSearch}>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Retour" onClick={() => setSearchOpen(false)}><ArrowLeft className="size-5" /></Button>
              <Input ref={inputRef} autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher sur Gabomazone" aria-label="Rechercher sur Gabomazone" className="h-10 min-w-0 flex-1 rounded-full" />
              <Button type="submit" variant="ghost" size="icon" className="shrink-0" aria-label="Lancer la recherche"><Search className="size-5" /></Button>
            </form>
          ) : (
            <>
              <Link to="/feed" className="min-w-0 shrink truncate font-display text-lg font-bold brand-text sm:text-xl">gabomazone</Link>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="ghost" size="icon" aria-label="Rechercher" onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}><Search className="size-5" /></Button>
                <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative"><Link to="/notifications"><Bell className="size-5" />{unread > 0 && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{unread > 9 ? "9+" : unread}</span>}</Link></Button>
                <Button asChild variant="ghost" size="icon" aria-label={unreadMessages > 0 ? `Messages (${unreadMessages} non lus)` : "Messages"} className="relative"><Link to="/messages"><MessageCircle className="size-5" />{unreadMessages > 0 && <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}</Link></Button>
                <Button variant="ghost" size="icon" aria-label="Ouvrir le menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu className="size-6" /></Button>
              </div>
            </>
          )}
        </div>
        {searchOpen && (
          <div className="absolute inset-x-0 top-14 max-h-[min(70dvh,500px)] overflow-y-auto border-b border-border bg-background shadow-lg">
            <div className="mx-auto max-w-2xl px-4 py-3">
              {search.trim().length > 1 && <>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Suggestions</p>
                {(suggestions ?? []).map((item, i) => <Button key={`${item.detail}-${i}`} variant="ghost" className="flex w-full justify-start gap-3" onClick={() => { setSearch(item.label); const next = [item.label, ...recent.filter((r) => r !== item.label)].slice(0, 6); setRecent(next); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setSearchOpen(false); navigate({ to: "/explore", search: { q: item.label } }); }}><Search className="size-4" /><span className="truncate">{item.label}</span><span className="ml-auto text-xs text-muted-foreground">{item.detail}</span></Button>)}
              </>}
              {recent.length > 0 && <><p className="mb-2 mt-2 text-xs font-semibold text-muted-foreground">Recherches récentes</p>{recent.map((item) => <div key={item} className="flex items-center gap-1"><Button variant="ghost" className="min-w-0 flex-1 justify-start gap-3" onClick={() => { setSearch(item); setSearchOpen(false); navigate({ to: "/explore", search: { q: item } }); }}><Search className="size-4" /><span className="truncate">{item}</span></Button><Button variant="ghost" size="icon" aria-label={`Effacer ${item}`} onClick={() => { const next = recent.filter((r) => r !== item); setRecent(next); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); }}><X className="size-4" /></Button></div>)}</>}
              {!recent.length && search.trim().length < 2 && <p className="py-4 text-center text-sm text-muted-foreground">Aucune recherche récente</p>}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-around px-2 py-2">
          {navItems.map(({ to, label, icon: Icon }) => <Link key={to} to={to} aria-label={label} className="flex min-w-12 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] text-muted-foreground transition-colors" activeProps={{ className: "text-primary" }}><Icon className="size-5" />{label}</Link>)}
        </div>
      </nav>

      {menuOpen && <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="mx-auto flex h-14 w-full max-w-2xl shrink-0 items-center justify-between border-b border-border px-4"><h2 className="font-display text-2xl font-bold">Menu</h2><Button variant="ghost" size="icon" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}><X className="size-6" /></Button></div>
        <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8 pt-4">
          <Link to="/me" onClick={() => setMenuOpen(false)} className="mb-5 flex items-center gap-3 border-b border-border pb-5"><UserAvatar avatarPath={profile?.avatar_url} name={profile?.display_name || profile?.username} className="size-14" /><span className="min-w-0"><span className="block truncate text-base font-bold">{profile?.display_name || profile?.username || "Mon profil"}</span><span className="text-sm text-muted-foreground">Voir votre profil</span></span></Link>
          <div className="grid grid-cols-2 gap-2">{shortcuts.slice(0, 3).map(({ to, label, icon: Icon }) => <Button key={label} asChild variant="outline" className="h-16 justify-start gap-3 border-border bg-card px-4 text-sm"><Link to={to} onClick={() => setMenuOpen(false)}><Icon className="size-5 shrink-0 text-primary" />{label}</Link></Button>)}<Button asChild variant="outline" className="h-16 justify-start gap-3 border-border bg-card px-4 text-sm"><Link to="/settings/$section" params={{ section: "saved" }} onClick={() => setMenuOpen(false)}><Bookmark className="size-5 shrink-0 text-primary" />Enregistrés</Link></Button>{shortcuts.slice(3).map(({ to, label, icon: Icon }) => <Button key={label} asChild variant="outline" className="h-16 justify-start gap-3 border-border bg-card px-4 text-sm"><Link to={to} onClick={() => setMenuOpen(false)}><Icon className="size-5 shrink-0 text-primary" />{label}</Link></Button>)}</div>
          <div className="mt-6 border-t border-border">
            <Button variant="ghost" className="h-14 w-full justify-start gap-3 px-1 text-base font-semibold" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings className="size-5" />Paramètres et confidentialité<ChevronDown className={`ml-auto size-5 transition-transform ${settingsOpen ? "rotate-180" : ""}`} /></Button>
            {settingsOpen && <div className="space-y-1 pb-3 pl-8"><Button asChild variant="ghost" className="w-full justify-start"><Link to="/settings" onClick={() => setMenuOpen(false)}>Tous les paramètres</Link></Button>{Object.entries(MAIN_SECTIONS).filter(([key]) => key !== "support").map(([key, section]) => <Button key={key} asChild variant="ghost" className="w-full justify-start"><Link to="/settings/$section" params={{ section: key }} onClick={() => setMenuOpen(false)}>{section.title}</Link></Button>)}</div>}
          </div>
          <div className="border-t border-border"><Button variant="ghost" className="h-14 w-full justify-start gap-3 px-1 text-base font-semibold" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}><CircleHelp className="size-5" />Aide et assistance<ChevronDown className={`ml-auto size-5 transition-transform ${helpOpen ? "rotate-180" : ""}`} /></Button>{helpOpen && <div className="pb-3 pl-8"><Button asChild variant="ghost" className="w-full justify-start"><Link to="/settings/$section" params={{ section: "support" }} onClick={() => setMenuOpen(false)}>FAQ et contacter le support</Link></Button></div>}</div>
          <div className="mt-3 border-t border-border pt-4"><Button variant="ghost" className="w-full justify-start gap-3 px-1 text-destructive" onClick={signOut}><LogOut className="size-5" />Déconnexion</Button></div>
        </div>
      </div>}
    </div>
  );
}
