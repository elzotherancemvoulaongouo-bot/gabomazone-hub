import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MediaViewerProvider } from "@/components/MediaViewerContext";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Lien direct vers un contenu : on montre son aperçu public avec un bouton de connexion.
      const m = location.pathname.match(/^\/(p|watch|pg|g|u)\/([^/]+)\/?$/);
      if (m) throw redirect({ to: "/s/$kind/$id", params: { kind: m[1], id: decodeURIComponent(m[2]) } });
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  return <MediaViewerProvider userId={user.id}><AppShell><Outlet /></AppShell></MediaViewerProvider>;
}