-- Algorithme 3 : recommandations (amis, groupes, pages)
CREATE TABLE IF NOT EXISTS public.recommendation_dismissals (
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('user','group','page')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, DELETE ON public.recommendation_dismissals TO authenticated;
GRANT ALL ON public.recommendation_dismissals TO service_role;
ALTER TABLE public.recommendation_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY rd_select ON public.recommendation_dismissals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY rd_insert ON public.recommendation_dismissals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY rd_delete ON public.recommendation_dismissals FOR DELETE TO authenticated USING (user_id = auth.uid());

INSERT INTO public.algorithm_settings (key, enabled, weights)
VALUES ('recommendations', true, '{"mutual_friend":3,"same_group":2,"same_city":1.5,"friend_member":2,"interest":1,"limit":10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Mes amis = demandes acceptées dans un sens ou l'autre
CREATE OR REPLACE FUNCTION public.recommend_people(_limit int DEFAULT 10)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, city text, score numeric, reasons text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  cfg AS (SELECT COALESCE(enabled,true) en, weights w FROM algorithm_settings WHERE key='recommendations'),
  my_friends AS (
    SELECT CASE WHEN sender_id=(SELECT uid FROM me) THEN receiver_id ELSE sender_id END fid
    FROM friend_requests WHERE status='accepted' AND (SELECT uid FROM me) IN (sender_id, receiver_id)),
  my_groups AS (SELECT group_id FROM group_members WHERE user_id=(SELECT uid FROM me) AND status='active'),
  my_city AS (SELECT lower(city) c FROM profiles WHERE id=(SELECT uid FROM me)),
  cand AS (
    SELECT p.id, p.username, p.display_name, p.avatar_url, p.city,
      (SELECT count(*) FROM friend_requests fr JOIN my_friends mf ON mf.fid IN (fr.sender_id, fr.receiver_id)
        WHERE fr.status='accepted' AND p.id IN (fr.sender_id, fr.receiver_id) AND mf.fid<>p.id) mutual,
      (SELECT count(*) FROM group_members gm JOIN my_groups mg USING (group_id) WHERE gm.user_id=p.id AND gm.status='active') groups,
      (p.city IS NOT NULL AND lower(p.city)=(SELECT c FROM my_city)) same_city
    FROM profiles p
    WHERE p.id <> (SELECT uid FROM me)
      AND NOT EXISTS (SELECT 1 FROM friend_requests fr WHERE (fr.sender_id=p.id AND fr.receiver_id=(SELECT uid FROM me)) OR (fr.receiver_id=p.id AND fr.sender_id=(SELECT uid FROM me)))
      AND NOT is_blocked_between((SELECT uid FROM me), p.id)
      AND NOT EXISTS (SELECT 1 FROM recommendation_dismissals d WHERE d.user_id=(SELECT uid FROM me) AND d.target_type='user' AND d.target_id=p.id)
  )
  SELECT c.id, c.username, c.display_name, c.avatar_url, c.city,
    (c.mutual*COALESCE((cfg.w->>'mutual_friend')::numeric,3) + c.groups*COALESCE((cfg.w->>'same_group')::numeric,2)
      + CASE WHEN c.same_city THEN COALESCE((cfg.w->>'same_city')::numeric,1.5) ELSE 0 END)::numeric AS score,
    array_remove(ARRAY[
      CASE WHEN c.mutual>0 THEN c.mutual||' ami(s) en commun' END,
      CASE WHEN c.groups>0 THEN c.groups||' groupe(s) en commun' END,
      CASE WHEN c.same_city THEN 'Même ville' END], NULL) AS reasons
  FROM cand c, cfg
  WHERE (SELECT uid FROM me) IS NOT NULL AND cfg.en
  ORDER BY score DESC, random()
  LIMIT LEAST(GREATEST(_limit,1),50);
$$;

CREATE OR REPLACE FUNCTION public.recommend_communities(_limit int DEFAULT 10)
RETURNS TABLE(kind text, id uuid, slug text, name text, avatar_url text, category text, score numeric, reasons text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  cfg AS (SELECT COALESCE(enabled,true) en, weights w FROM algorithm_settings WHERE key='recommendations'),
  my_friends AS (
    SELECT CASE WHEN sender_id=(SELECT uid FROM me) THEN receiver_id ELSE sender_id END fid
    FROM friend_requests WHERE status='accepted' AND (SELECT uid FROM me) IN (sender_id, receiver_id)),
  my_cats AS (
    SELECT lower(g.category) c FROM groups g JOIN group_members gm ON gm.group_id=g.id WHERE gm.user_id=(SELECT uid FROM me) AND g.category IS NOT NULL
    UNION SELECT lower(pg.category) FROM pages pg JOIN page_followers pf ON pf.page_id=pg.id WHERE pf.user_id=(SELECT uid FROM me) AND pg.category IS NOT NULL),
  g AS (
    SELECT 'group'::text kind, g.id, g.slug, g.name, g.avatar_url, g.category,
      (SELECT count(*) FROM group_members gm JOIN my_friends f ON f.fid=gm.user_id WHERE gm.group_id=g.id AND gm.status='active') fr,
      (lower(g.category) IN (SELECT c FROM my_cats)) inter
    FROM groups g
    WHERE NOT g.is_private
      AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id=g.id AND gm.user_id=(SELECT uid FROM me))
      AND NOT EXISTS (SELECT 1 FROM recommendation_dismissals d WHERE d.user_id=(SELECT uid FROM me) AND d.target_type='group' AND d.target_id=g.id)
      AND NOT is_blocked_between((SELECT uid FROM me), g.owner_id)),
  p AS (
    SELECT 'page'::text, pg.id, pg.slug, pg.name, pg.avatar_url, pg.category,
      (SELECT count(*) FROM page_followers pf JOIN my_friends f ON f.fid=pf.user_id WHERE pf.page_id=pg.id),
      (lower(pg.category) IN (SELECT c FROM my_cats))
    FROM pages pg
    WHERE NOT EXISTS (SELECT 1 FROM page_followers pf WHERE pf.page_id=pg.id AND pf.user_id=(SELECT uid FROM me))
      AND pg.owner_id <> (SELECT uid FROM me)
      AND NOT EXISTS (SELECT 1 FROM recommendation_dismissals d WHERE d.user_id=(SELECT uid FROM me) AND d.target_type='page' AND d.target_id=pg.id)
      AND NOT is_blocked_between((SELECT uid FROM me), pg.owner_id)),
  allc AS (SELECT * FROM g UNION ALL SELECT * FROM p)
  SELECT a.kind, a.id, a.slug, a.name, a.avatar_url, a.category,
    (a.fr*COALESCE((cfg.w->>'friend_member')::numeric,2) + CASE WHEN a.inter THEN COALESCE((cfg.w->>'interest')::numeric,1) ELSE 0 END)::numeric,
    array_remove(ARRAY[CASE WHEN a.fr>0 THEN a.fr||' ami(s) y participent' END, CASE WHEN a.inter THEN 'Selon vos centres d''intérêt' END], NULL)
  FROM allc a, cfg
  WHERE (SELECT uid FROM me) IS NOT NULL AND cfg.en
  ORDER BY 7 DESC, random()
  LIMIT LEAST(GREATEST(_limit,1),50);
$$;

REVOKE EXECUTE ON FUNCTION public.recommend_people(int) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.recommend_communities(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recommend_people(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_communities(int) TO authenticated;