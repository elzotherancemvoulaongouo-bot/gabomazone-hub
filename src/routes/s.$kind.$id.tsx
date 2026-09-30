import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getSharePreview } from "@/lib/share-preview.functions";
import { rememberAfterLogin } from "@/lib/share";

const KINDS = ["p", "watch", "pg", "g", "u"] as const;
type Kind = (typeof KINDS)[number];

export const Route = createFileRoute("/s/$kind/$id")({
  loader: async ({ params }) => {
    const kind = (KINDS as readonly string[]).includes(params.kind) ? (params.kind as Kind) : null;
    if (!kind) return { preview: null };
    try {
      return { preview: await getSharePreview({ data: { kind, id: params.id } }) };
    } catch {
      return { preview: null };
    }
  },
  head: ({ loaderData }) => {
    const p = loaderData?.preview;
    const title = p?.title ?? "Contenu partagé — Gabomazone";
    const description = p?.description ?? "Rejoignez Gabomazone pour voir ce contenu.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(p?.image
          ? [
              { property: "og:image", content: p.image },
              { name: "twitter:image", content: p.image },
            ]
          : []),
      ],
    };
  },
  errorComponent: () => <div className="p-8 text-center">Lien indisponible.</div>,
  notFoundComponent: () => <div className="p-8 text-center">Contenu introuvable.</div>,
  component: SharedPreview,
});

function SharedPreview() {
  const { preview } = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && preview) router.history.replace(preview.target);
    });
  }, [preview, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {preview?.image && (
          <img src={preview.image} alt="" className="aspect-video w-full object-cover" />
        )}
        <div className="space-y-3 p-5">
          <p className="font-display text-lg font-bold brand-text">gabomazone</p>
          <h1 className="text-xl font-semibold">{preview?.title ?? "Contenu indisponible"}</h1>
          <p className="text-sm text-muted-foreground">
            {preview?.description ?? "Ce contenu est privé ou n'existe plus."}
          </p>
          <Button asChild className="w-full">
            <Link to="/auth" onClick={() => preview && rememberAfterLogin(preview.target)}>
              Se connecter pour voir
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
