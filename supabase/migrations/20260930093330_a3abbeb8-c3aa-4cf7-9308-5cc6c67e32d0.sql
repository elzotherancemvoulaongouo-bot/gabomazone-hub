GRANT SELECT, INSERT, DELETE ON public.community_invites TO authenticated;
GRANT ALL ON public.community_invites TO service_role;
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
GRANT SELECT, INSERT, DELETE ON public.community_user_flags TO authenticated;
GRANT ALL ON public.community_user_flags TO service_role;