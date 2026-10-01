import { createFileRoute } from "@tanstack/react-router";
import webpush from "web-push";

type PushPayload = {
  user_id?: string;
  type?: string;
  preview?: string | null;
  actor?: string | null;
  post_id?: string | null;
  conversation_id?: string | null;
  page_id?: string | null;
  group_id?: string | null;
};

function buildMessage(p: PushPayload): { title: string; body: string; url: string } {
  const who = p.actor || "Quelqu'un";
  switch (p.type) {
    case "message":
      return {
        title: who,
        body: p.preview || "Vous a envoyé un message",
        url: p.conversation_id ? `/m/${p.conversation_id}` : "/messages",
      };
    case "like":
      return {
        title: "Gabomazone",
        body: `${who} a aimé votre publication`,
        url: p.post_id ? `/p/${p.post_id}` : "/notifications",
      };
    case "comment":
      return {
        title: "Gabomazone",
        body: `${who} a commenté : ${p.preview ?? ""}`.trim(),
        url: p.post_id ? `/p/${p.post_id}` : "/notifications",
      };
    case "friend_accepted":
      return { title: "Gabomazone", body: `${who} a accepté votre demande d'ami`, url: "/friends" };
    case "page_invite":
      return {
        title: "Gabomazone",
        body: `${who} vous invite à suivre la page ${p.preview ?? ""}`.trim(),
        url: "/notifications",
      };
    case "group_invite":
      return {
        title: "Gabomazone",
        body: `${who} vous invite à rejoindre le groupe ${p.preview ?? ""}`.trim(),
        url: "/notifications",
      };
    case "moderation_warning":
      return { title: "Gabomazone", body: p.preview || "Avertissement de modération", url: "/notifications" };
    default:
      return { title: "Gabomazone", body: p.preview || "Nouvelle notification", url: "/notifications" };
  }
}

export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-webhook-signature") ?? "";
        const secret = process.env["PUSH_WEBHOOK_SECRET"];
        if (!secret || signature !== secret) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: PushPayload;
        try {
          payload = (await request.json()) as PushPayload;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!payload.user_id) return new Response("Bad request", { status: 400 });

        const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
        const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
        if (!vapidPublic || !vapidPrivate) {
          return new Response("Push not configured", { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", payload.user_id);
        if (error) return new Response("DB error", { status: 500 });
        if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

        webpush.setVapidDetails("mailto:Zonegaboma@gmail.com", vapidPublic, vapidPrivate);
        const message = JSON.stringify(buildMessage(payload));

        const results = await Promise.allSettled(
          subs.map((s) =>
            webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              message,
            ),
          ),
        );

        // Nettoie les abonnements expirés (410 Gone).
        const staleIds = subs
          .filter((_, i) => {
            const r = results[i];
            return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
          })
          .map((s) => s.id);
        if (staleIds.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
        }

        return new Response("ok");
      },
    },
  },
});
