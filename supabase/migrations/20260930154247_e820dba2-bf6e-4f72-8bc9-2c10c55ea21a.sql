REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_page_admin(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_page_admin(uuid, uuid) TO authenticated;