CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
REVOKE EXECUTE ON FUNCTION public.notify_push() FROM anon, authenticated, public;