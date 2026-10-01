import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Abonne l'appareil aux notifications push et enregistre l'abonnement en base.
 * Silencieux si le navigateur ne supporte pas le push ou si l'utilisateur refuse.
 */
export async function enablePushNotifications(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) return false;

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const { error } = await supabase.from("push_subscriptions" as never).upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      } as never,
      { onConflict: "endpoint" },
    );
    return !error;
  } catch {
    return false;
  }
}

/** Désabonne l'appareil et retire l'abonnement de la base. */
export async function disablePushNotifications(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase
        .from("push_subscriptions" as never)
        .delete()
        .eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch {
    // silencieux
  }
}
