-- 1. Contact privé des profils : seulement soi-même et ses amis
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, display_name, bio, avatar_url, cover_url, created_at, updated_at,
  first_name, last_name, birthdate, gender, country, city, website) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_contact(_id uuid)
RETURNS TABLE(phone text, contact_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.phone, p.contact_email FROM public.profiles p
  WHERE p.id = _id AND auth.uid() IS NOT NULL
    AND (p.id = auth.uid() OR public.are_friends(auth.uid(), p.id))
$$;
REVOKE EXECUTE ON FUNCTION public.get_profile_contact(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_profile_contact(uuid) TO authenticated;

-- 2. Membres des groupes privés : visibles seulement des membres
DROP POLICY IF EXISTS group_members_public_read ON public.group_members;
CREATE POLICY group_members_read ON public.group_members FOR SELECT USING (
  public.is_group_public(group_id)
  OR user_id = auth.uid()
  OR (auth.uid() IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
);

-- 3. Admins des pages : visibles seulement des admins de la page
DROP POLICY IF EXISTS page_admins_public_read ON public.page_admins;
CREATE POLICY page_admins_read ON public.page_admins FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_page_admin(page_id, auth.uid())
);