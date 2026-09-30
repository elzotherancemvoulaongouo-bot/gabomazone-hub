CREATE OR REPLACE FUNCTION public.is_friend_of_me(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'accepted'
      AND ((sender_id = auth.uid() AND receiver_id = _other) OR (sender_id = _other AND receiver_id = auth.uid()))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_friend_of_me(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_friend_of_me(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS posts_read ON public.posts;
CREATE POLICY posts_read ON public.posts FOR SELECT TO anon, authenticated USING (
  ((group_id IS NULL) OR is_group_public(group_id) OR is_group_member(group_id, auth.uid()))
  AND ((visibility = 'public') OR (page_id IS NOT NULL) OR (group_id IS NOT NULL) OR (auth.uid() = user_id)
       OR ((visibility = 'friends') AND is_friend_of_me(user_id)))
);