import { createServerFn } from "@tanstack/react-start";

/** Renvoie la clé publique VAPID (sans danger côté client) pour l'abonnement push. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return process.env["VAPID_PUBLIC_KEY"] ?? null;
});
