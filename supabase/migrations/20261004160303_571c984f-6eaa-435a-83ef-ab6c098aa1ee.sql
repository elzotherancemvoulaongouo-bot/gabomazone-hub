-- Configuration des algorithmes (une ligne par module)
CREATE TABLE public.algorithm_settings (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.algorithm_settings TO authenticated;
GRANT UPDATE ON public.algorithm_settings TO authenticated;
GRANT ALL ON public.algorithm_settings TO service_role;
ALTER TABLE public.algorithm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "algo_settings_read" ON public.algorithm_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "algo_settings_admin_update" ON public.algorithm_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER algorithm_settings_updated_at BEFORE UPDATE ON public.algorithm_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.algorithm_settings (key, enabled, weights) VALUES
('feed', true, '{"freshness":10,"freshness_half_life_hours":12,"reaction":1,"comment":2,"share":3,"friend":4,"follow":3,"community":2,"interaction":1.5,"report_penalty":5,"spam_penalty":6,"max_same_author_in_row":2}'::jsonb);

-- Partages des publications (signal pour le score)
CREATE TABLE public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_shares_insert_own" ON public.post_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_shares_read_own" ON public.post_shares FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX post_shares_post_idx ON public.post_shares(post_id);

-- Score des publications pour le spectateur connecté.
-- Ne renvoie que des scores (aucun contenu) pour des publications déjà visibles par lui.
CREATE OR REPLACE FUNCTION public.score_posts(_ids uuid[])
RETURNS TABLE(post_id uuid, score numeric, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  w jsonb;
  on_ boolean;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  SELECT weights, enabled INTO w, on_ FROM public.algorithm_settings WHERE key = 'feed';
  IF NOT coalesce(on_, false) THEN RETURN; END IF;
  RETURN QUERY
  WITH p AS (
    SELECT po.id, po.user_id, po.page_id, po.group_id, po.caption, po.created_at
    FROM public.posts po WHERE po.id = ANY(_ids)
  ), s AS (
    SELECT p.id,
      -- fraîcheur : décroît avec l'âge (demi-vie configurable)
      (w->>'freshness')::numeric / (1 + extract(epoch FROM now() - p.created_at) / 3600 / greatest((w->>'freshness_half_life_hours')::numeric, 1)) AS fresh,
      (SELECT count(*) FROM public.likes l WHERE l.post_id = p.id) AS n_likes,
      (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id) AS n_comments,
      (SELECT count(*) FROM public.post_shares sh WHERE sh.post_id = p.id) AS n_shares,
      public.are_friends(me, p.user_id) AS is_friend,
      EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = me AND f.following_id = p.user_id) AS is_follow,
      (p.page_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.page_followers pf WHERE pf.page_id = p.page_id AND pf.user_id = me))
        OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, me)) AS is_comm,
      (SELECT count(*) FROM public.likes l JOIN public.posts x ON x.id = l.post_id
         WHERE l.user_id = me AND x.user_id = p.user_id AND l.created_at > now() - interval '30 days')
      + (SELECT count(*) FROM public.comments c JOIN public.posts x ON x.id = c.post_id
         WHERE c.user_id = me AND x.user_id = p.user_id AND c.created_at > now() - interval '30 days') AS n_inter,
      (SELECT count(DISTINCT r.reporter_id) FROM public.reports r
         WHERE r.target_type = 'post' AND r.target_id = p.id AND r.status = 'pending') AS n_reports,
      -- spam probable : rafale (>5 posts de l'auteur dans l'heure) ou texte dupliqué
      ((SELECT count(*) FROM public.posts y WHERE y.user_id = p.user_id
          AND y.created_at BETWEEN p.created_at - interval '1 hour' AND p.created_at) > 5
       OR (p.caption IS NOT NULL AND length(p.caption) > 10 AND EXISTS (
          SELECT 1 FROM public.posts z WHERE z.user_id = p.user_id AND z.id <> p.id AND z.caption = p.caption))) AS spam
    FROM p
  )
  SELECT s.id,
    round(s.fresh
      + ln(1 + s.n_likes * (w->>'reaction')::numeric) * 3
      + ln(1 + s.n_comments * (w->>'comment')::numeric) * 3
      + ln(1 + s.n_shares * (w->>'share')::numeric) * 3
      + CASE WHEN s.is_friend THEN (w->>'friend')::numeric ELSE 0 END
      + CASE WHEN s.is_follow THEN (w->>'follow')::numeric ELSE 0 END
      + CASE WHEN s.is_comm THEN (w->>'community')::numeric ELSE 0 END
      + ln(1 + s.n_inter) * (w->>'interaction')::numeric
      - s.n_reports * (w->>'report_penalty')::numeric
      - CASE WHEN s.spam THEN (w->>'spam_penalty')::numeric ELSE 0 END, 2),
    concat_ws(', ',
      CASE WHEN s.is_friend THEN 'ami' END,
      CASE WHEN s.is_follow THEN 'suivi' END,
      CASE WHEN s.is_comm THEN 'page/groupe suivi' END,
      CASE WHEN s.n_inter > 0 THEN 'interactions passées' END,
      CASE WHEN s.n_likes + s.n_comments + s.n_shares > 0 THEN 'engagement' END,
      CASE WHEN s.n_reports > 0 THEN 'signalé' END,
      CASE WHEN s.spam THEN 'spam probable' END)
  FROM s;
END; $$;
REVOKE EXECUTE ON FUNCTION public.score_posts(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.score_posts(uuid[]) TO authenticated;