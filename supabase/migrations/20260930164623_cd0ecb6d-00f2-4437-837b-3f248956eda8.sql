
REVOKE EXECUTE ON FUNCTION public.reports_rate_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reports_auto_hide() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.moderate_text_trigger() FROM anon, authenticated, public;
-- Nécessaires aux règles de lecture des publications pour les visiteurs (renvoient faux sans connexion)
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_suspended(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated;
