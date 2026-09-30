
-- 1. Rôles
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'))
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_moderator(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;

-- 2. Mots interdits
CREATE TABLE public.banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  severity text NOT NULL DEFAULT 'mask' CHECK (severity IN ('reject','mask','review')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_words TO authenticated;
GRANT ALL ON public.banned_words TO service_role;
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderators manage banned words" ON public.banned_words FOR ALL TO authenticated
  USING (public.is_moderator(auth.uid())) WITH CHECK (public.is_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.moderation_normalize(_t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(lower(coalesce(_t,'')),
    'àâäáãåéèêëíìîïóòôöõúùûüçñýÿ0134578@$',
    'aaaaaaeeeeiiiiooooouuuucnyyoieastbas')
$$;

-- 3. Statut de modération (ajout de colonnes, non destructif)
ALTER TABLE public.posts ADD COLUMN moderation_status text NOT NULL DEFAULT 'visible';
ALTER TABLE public.comments ADD COLUMN moderation_status text NOT NULL DEFAULT 'visible';

-- 4. Signalements
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('post','comment','profile','page','group')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','rejected')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX reports_target_idx ON public.reports (target_type, target_id);
CREATE INDEX reports_reporter_time_idx ON public.reports (reporter_id, created_at);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report as self" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'pending');
CREATE POLICY "read own or moderator" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_moderator(auth.uid()));

-- Limite : 10 signalements / heure
CREATE OR REPLACE FUNCTION public.reports_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reporter_id IS NOT NULL AND (
    SELECT count(*) FROM public.reports
    WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Trop de signalements : réessayez dans une heure';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER reports_rate_limit_trg BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_rate_limit();

-- Masquage automatique à 3 signalements distincts
CREATE OR REPLACE FUNCTION public.reports_auto_hide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(DISTINCT reporter_id) FROM public.reports
      WHERE target_type = NEW.target_type AND target_id = NEW.target_id
        AND status = 'pending' AND reporter_id IS NOT NULL) >= 3 THEN
    IF NEW.target_type = 'post' THEN
      UPDATE public.posts SET moderation_status = 'hidden' WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE public.comments SET moderation_status = 'hidden' WHERE id = NEW.target_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER reports_auto_hide_trg AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_auto_hide();

-- Filtre des mots interdits (publications et commentaires)
CREATE OR REPLACE FUNCTION public.moderate_text_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  col text := CASE WHEN TG_TABLE_NAME = 'posts' THEN 'caption' ELSE 'content' END;
  txt text;
  norm text;
  w record;
  needs_review boolean := false;
  pattern text;
BEGIN
  txt := CASE WHEN TG_TABLE_NAME = 'posts' THEN NEW.caption ELSE NEW.content END;
  IF txt IS NULL OR btrim(txt) = '' THEN RETURN NEW; END IF;
  FOR w IN SELECT word, severity FROM public.banned_words LOOP
    norm := public.moderation_normalize(txt);
    pattern := '\m' || regexp_replace(public.moderation_normalize(w.word), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M';
    IF norm ~ pattern THEN
      IF w.severity = 'reject' THEN
        RAISE EXCEPTION 'Ce texte contient un mot interdit par les règles de la communauté';
      ELSIF w.severity = 'mask' THEN
        -- remplace les caractères aux mêmes positions (normalisation conserve la longueur)
        WHILE public.moderation_normalize(txt) ~ pattern LOOP
          DECLARE pos int; len int; m text;
          BEGIN
            m := substring(public.moderation_normalize(txt) from pattern);
            len := length(m);
            pos := position(m in public.moderation_normalize(txt));
            EXIT WHEN pos = 0 OR len = 0;
            txt := overlay(txt placing repeat('*', len) from pos for len);
          END;
        END LOOP;
      ELSE
        needs_review := true;
      END IF;
    END IF;
  END LOOP;
  IF TG_TABLE_NAME = 'posts' THEN NEW.caption := txt; ELSE NEW.content := txt; END IF;
  IF needs_review THEN
    INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
    VALUES (NULL, CASE WHEN TG_TABLE_NAME = 'posts' THEN 'post' ELSE 'comment' END, NEW.id, 'mot_sensible_auto')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER posts_moderate_text BEFORE INSERT OR UPDATE OF caption ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.moderate_text_trigger();
CREATE TRIGGER comments_moderate_text BEFORE INSERT OR UPDATE OF content ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.moderate_text_trigger();

-- 5. Suspensions et journal
CREATE TABLE public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  until timestamptz NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_suspensions TO authenticated;
GRANT ALL ON public.user_suspensions TO service_role;
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or moderator" ON public.user_suspensions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator(auth.uid()));

CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('delete','warn','suspend','reject')),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  target_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderators read log" ON public.moderation_actions FOR SELECT TO authenticated
  USING (public.is_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_suspensions WHERE user_id = _user_id AND until > now())
$$;
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a))
$$;

-- Action du modérateur (vérifiée côté serveur)
CREATE OR REPLACE FUNCTION public.moderate_report(_report_id uuid, _action text, _note text DEFAULT NULL, _days int DEFAULT 7)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reports; owner uuid;
BEGIN
  IF NOT public.is_moderator(auth.uid()) THEN RAISE EXCEPTION 'Accès réservé aux modérateurs'; END IF;
  SELECT * INTO r FROM public.reports WHERE id = _report_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Signalement introuvable'; END IF;
  owner := CASE r.target_type
    WHEN 'post' THEN (SELECT user_id FROM public.posts WHERE id = r.target_id)
    WHEN 'comment' THEN (SELECT user_id FROM public.comments WHERE id = r.target_id)
    WHEN 'profile' THEN r.target_id
    WHEN 'page' THEN (SELECT owner_id FROM public.pages WHERE id = r.target_id)
    WHEN 'group' THEN (SELECT owner_id FROM public.groups WHERE id = r.target_id) END;

  IF _action = 'delete' THEN
    IF r.target_type = 'post' THEN DELETE FROM public.posts WHERE id = r.target_id;
    ELSIF r.target_type = 'comment' THEN DELETE FROM public.comments WHERE id = r.target_id;
    ELSE RAISE EXCEPTION 'Seules les publications et commentaires peuvent être supprimés ici : suspendez le propriétaire';
    END IF;
  ELSIF _action = 'warn' THEN
    IF owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, actor_id, type, preview)
      VALUES (owner, NULL, 'moderation_warning', coalesce(_note, 'Votre contenu ne respecte pas les règles de la communauté.'));
    END IF;
  ELSIF _action = 'suspend' THEN
    IF owner IS NULL THEN RAISE EXCEPTION 'Propriétaire introuvable'; END IF;
    INSERT INTO public.user_suspensions (user_id, until, reason, created_by)
    VALUES (owner, now() + make_interval(days => greatest(_days, 1)), _note, auth.uid());
  ELSIF _action = 'reject' THEN
    IF r.target_type = 'post' THEN UPDATE public.posts SET moderation_status = 'visible' WHERE id = r.target_id;
    ELSIF r.target_type = 'comment' THEN UPDATE public.comments SET moderation_status = 'visible' WHERE id = r.target_id;
    END IF;
  ELSE RAISE EXCEPTION 'Action inconnue';
  END IF;

  UPDATE public.reports SET status = CASE WHEN _action = 'reject' THEN 'rejected' ELSE 'resolved' END,
    resolved_by = auth.uid(), resolved_at = now()
  WHERE target_type = r.target_type AND target_id = r.target_id AND status = 'pending';

  INSERT INTO public.moderation_actions (moderator_id, report_id, action, target_type, target_id, target_user_id, note)
  VALUES (auth.uid(), _report_id, _action, r.target_type, r.target_id, owner, _note);
END; $$;
REVOKE EXECUTE ON FUNCTION public.moderate_report(uuid, text, text, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.moderate_report(uuid, text, text, int) TO authenticated;

-- 6. Règles restrictives (s'ajoutent aux règles existantes sans les modifier)
CREATE POLICY "mod: hide hidden or blocked posts" ON public.posts AS RESTRICTIVE FOR SELECT TO public
  USING (
    user_id = auth.uid()
    OR (moderation_status <> 'hidden' AND NOT public.is_blocked_between(auth.uid(), user_id))
    OR public.is_moderator(auth.uid())
  );
CREATE POLICY "mod: suspended cannot post" ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_suspended(auth.uid()) AND moderation_status = 'visible');

CREATE POLICY "mod: hide hidden or blocked comments" ON public.comments AS RESTRICTIVE FOR SELECT TO public
  USING (
    user_id = auth.uid()
    OR (moderation_status <> 'hidden' AND NOT public.is_blocked_between(auth.uid(), user_id))
    OR public.is_moderator(auth.uid())
  );
CREATE POLICY "mod: blocked or suspended cannot comment" ON public.comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_suspended(auth.uid())
    AND moderation_status = 'visible'
    AND NOT public.is_blocked_between(auth.uid(), (SELECT p.user_id FROM public.posts p WHERE p.id = post_id))
  );

CREATE POLICY "mod: blocked or suspended cannot message" ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_suspended(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND public.is_blocked_between(auth.uid(), CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END))
  );
