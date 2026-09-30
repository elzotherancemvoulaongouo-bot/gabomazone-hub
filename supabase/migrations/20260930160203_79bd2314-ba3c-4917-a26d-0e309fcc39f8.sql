REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, bio, avatar_url, cover_url, created_at, updated_at, country, city, website) ON public.profiles TO anon;