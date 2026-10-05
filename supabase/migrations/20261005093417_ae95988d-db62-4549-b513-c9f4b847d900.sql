CREATE TABLE public.moderation_auto_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post','comment','message')),
  target_id uuid NOT NULL,
  user_id uuid NOT NULL,
  excerpt text,
  score int NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  decision text NOT NULL CHECK (decision IN ('hidden','queued')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','restored','appealed')),
  appeal_text text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_auto_log TO authenticated;
GRANT ALL ON public.moderation_auto_log TO service_role;
ALTER TABLE public.moderation_auto_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto log: mods or author read" ON public.moderation_auto_log FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()) OR user_id = auth.uid());
CREATE INDEX ON public.moderation_auto_log (status, created_at DESC);
CREATE INDEX ON public.moderation_auto_log (user_id, created_at DESC);

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'message','friend_accepted','like','comment','page_invite','group_invite','moderation_warning','moderation_hidden']));

INSERT INTO public.algorithm_settings (key, enabled, weights) VALUES ('moderation', true, '{
  "hide_threshold": 90, "queue_threshold": 50,
  "banned_word": 45, "many_links": 25, "repeated_link": 30, "burst": 30, "duplicate": 35,
  "shouting": 10, "repeat_offender": 15,
  "cooldown_strikes": 5, "cooldown_minutes": 60
}'::jsonb) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.banned_words (word, severity)
SELECT w, 'review' FROM unnest(ARRAY['connard','connasse','salope','encule','batard','fdp','ntm']) w
WHERE NOT EXISTS (SELECT 1 FROM public.banned_words b WHERE lower(b.word) = w);

-- Score de risque 0-100 : somme de règles simples, plafonnée à 100.
CREATE OR REPLACE FUNCTION public.moderation_risk(_user uuid, _text text, _table text, _id uuid)
RETURNS TABLE(score int, reasons text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w jsonb := coalesce((SELECT weights FROM algorithm_settings WHERE key='moderation'), '{}');
  s numeric := 0; r text[] := '{}'; norm text := public.moderation_normalize(coalesce(_text,''));
  bw record; n int; link text; letters text;
BEGIN
  -- 1. mots interdits (toute gravité)
  FOR bw IN SELECT word FROM banned_words LOOP
    IF norm ~ ('\m' || regexp_replace(public.moderation_normalize(bw.word), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M') THEN
      s := s + coalesce((w->>'banned_word')::numeric,45); r := r || ('mot interdit : ' || bw.word);
    END IF;
  END LOOP;
  -- 2. liens nombreux / répétés
  n := (SELECT count(*) FROM regexp_matches(coalesce(_text,''), 'https?://', 'g'));
  IF n >= 3 THEN s := s + coalesce((w->>'many_links')::numeric,25); r := r || (n || ' liens'); END IF;
  link := substring(coalesce(_text,'') from 'https?://[^\s]+');
  IF link IS NOT NULL AND (
     (SELECT count(*) FROM posts WHERE user_id=_user AND id<>_id AND created_at > now()-interval '24 hours' AND caption LIKE '%'||link||'%') +
     (SELECT count(*) FROM comments WHERE user_id=_user AND id<>_id AND created_at > now()-interval '24 hours' AND content LIKE '%'||link||'%')) >= 2 THEN
    s := s + coalesce((w->>'repeated_link')::numeric,30); r := r || 'même lien répété';
  END IF;
  -- 3. rafale : 5+ contenus en 10 minutes
  n := (SELECT count(*) FROM posts WHERE user_id=_user AND created_at > now()-interval '10 minutes')
     + (SELECT count(*) FROM comments WHERE user_id=_user AND created_at > now()-interval '10 minutes');
  IF _table = 'messages' THEN n := (SELECT count(*) FROM messages WHERE sender_id=_user AND created_at > now()-interval '1 minute'); END IF;
  IF n >= 6 THEN s := s + coalesce((w->>'burst')::numeric,30); r := r || 'publications en rafale'; END IF;
  -- 4. texte dupliqué (24 h)
  IF length(norm) >= 8 AND (
     (SELECT count(*) FROM posts WHERE user_id=_user AND id<>_id AND created_at > now()-interval '24 hours' AND public.moderation_normalize(caption)=norm) +
     (SELECT count(*) FROM comments WHERE user_id=_user AND id<>_id AND created_at > now()-interval '24 hours' AND public.moderation_normalize(content)=norm)) >= 1 THEN
    s := s + coalesce((w->>'duplicate')::numeric,35); r := r || 'texte dupliqué';
  END IF;
  -- 5. majuscules (cris)
  letters := regexp_replace(coalesce(_text,''), '[^[:alpha:]]', '', 'g');
  IF length(letters) >= 20 AND length(regexp_replace(letters, '[^[:upper:]]', '', 'g'))::numeric / length(letters) > 0.7 THEN
    s := s + coalesce((w->>'shouting')::numeric,10); r := r || 'texte en majuscules';
  END IF;
  -- 6. récidive (3+ infractions sur 30 jours)
  IF (SELECT count(*) FROM moderation_auto_log l WHERE l.user_id=_user AND l.created_at > now()-interval '30 days' AND l.status <> 'approved') >= 3 THEN
    s := s + coalesce((w->>'repeat_offender')::numeric,15); r := r || 'récidive';
  END IF;
  score := least(100, round(s))::int; reasons := r; RETURN NEXT;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderation_risk(uuid,text,text,uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.moderation_auto_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg algorithm_settings; w jsonb; author uuid; txt text; kind text; res record; strikes int; dec text;
BEGIN
  SELECT * INTO cfg FROM algorithm_settings WHERE key='moderation';
  IF cfg.key IS NULL OR NOT cfg.enabled THEN RETURN NULL; END IF;
  w := cfg.weights;
  IF TG_TABLE_NAME='posts' THEN author := NEW.user_id; txt := NEW.caption; kind := 'post';
  ELSIF TG_TABLE_NAME='comments' THEN author := NEW.user_id; txt := NEW.content; kind := 'comment';
  ELSE author := NEW.sender_id; txt := NEW.content; kind := 'message'; END IF;

  -- Pause temporaire (cooldown) après trop d'infractions en 24 h — jamais de bannissement.
  strikes := (SELECT count(*) FROM moderation_auto_log WHERE user_id=author AND created_at > now()-interval '24 hours' AND status NOT IN ('approved','restored'));
  IF strikes >= coalesce((w->>'cooldown_strikes')::int,5) AND EXISTS (
     SELECT 1 FROM moderation_auto_log WHERE user_id=author
       AND created_at > now() - make_interval(mins => coalesce((w->>'cooldown_minutes')::int,60))) THEN
    RAISE EXCEPTION 'Trop de contenus signalés récemment : réessayez dans % minutes', coalesce((w->>'cooldown_minutes')::int,60);
  END IF;

  IF txt IS NULL OR btrim(txt)='' THEN RETURN NULL; END IF;
  SELECT * INTO res FROM moderation_risk(author, txt, TG_TABLE_NAME, NEW.id);
  IF res.score >= coalesce((w->>'hide_threshold')::int,90) AND kind <> 'message' THEN dec := 'hidden';
  ELSIF res.score >= coalesce((w->>'queue_threshold')::int,50) THEN dec := 'queued';
  ELSE RETURN NULL; END IF;

  INSERT INTO moderation_auto_log (target_type, target_id, user_id, excerpt, score, reasons, decision)
  VALUES (kind, NEW.id, author, left(txt, 200), res.score, res.reasons, dec);
  IF dec = 'hidden' THEN
    IF kind='post' THEN UPDATE posts SET moderation_status='hidden' WHERE id=NEW.id;
    ELSE UPDATE comments SET moderation_status='hidden' WHERE id=NEW.id; END IF;
    INSERT INTO notifications (user_id, actor_id, type, post_id, preview)
    VALUES (author, NULL, 'moderation_hidden', CASE WHEN kind='post' THEN NEW.id END,
      'Votre contenu a été masqué automatiquement (' || array_to_string(res.reasons, ', ') || '). Vous pouvez faire appel.');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER moderation_auto AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.moderation_auto_trigger();
CREATE TRIGGER moderation_auto AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.moderation_auto_trigger();
CREATE TRIGGER moderation_auto AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.moderation_auto_trigger();

-- Décision d'un modérateur : approve (contenu correct → visible), reject (reste masqué), restore (annuler le masquage).
CREATE OR REPLACE FUNCTION public.moderation_review(_log_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l moderation_auto_log;
BEGIN
  IF NOT is_moderator(auth.uid()) THEN RAISE EXCEPTION 'Accès réservé aux modérateurs'; END IF;
  SELECT * INTO l FROM moderation_auto_log WHERE id=_log_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Entrée introuvable'; END IF;
  IF _action IN ('approve','restore') THEN
    IF l.target_type='post' THEN UPDATE posts SET moderation_status='visible' WHERE id=l.target_id;
    ELSIF l.target_type='comment' THEN UPDATE comments SET moderation_status='visible' WHERE id=l.target_id; END IF;
  ELSIF _action='reject' THEN
    IF l.target_type='post' THEN UPDATE posts SET moderation_status='hidden' WHERE id=l.target_id;
    ELSIF l.target_type='comment' THEN UPDATE comments SET moderation_status='hidden' WHERE id=l.target_id; END IF;
  ELSE RAISE EXCEPTION 'Action inconnue'; END IF;
  UPDATE moderation_auto_log SET status = CASE _action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'restored' END,
    reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_log_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderation_review(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.moderation_review(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_appeal(_log_id uuid, _text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE moderation_auto_log SET status='appealed', appeal_text=left(coalesce(_text,''),500)
  WHERE id=_log_id AND user_id=auth.uid() AND status IN ('pending','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Appel impossible'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderation_appeal(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.moderation_appeal(uuid,text) TO authenticated;