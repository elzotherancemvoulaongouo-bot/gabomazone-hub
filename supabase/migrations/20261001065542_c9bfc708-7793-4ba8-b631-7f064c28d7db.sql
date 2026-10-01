CREATE OR REPLACE FUNCTION public.moderate_text_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  txt text;
  norm text;
  w record;
  needs_review boolean := false;
  pattern text;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    txt := NEW.caption;
  ELSE
    txt := NEW.content;
  END IF;
  IF txt IS NULL OR btrim(txt) = '' THEN RETURN NEW; END IF;
  FOR w IN SELECT word, severity FROM public.banned_words LOOP
    norm := public.moderation_normalize(txt);
    pattern := '\m' || regexp_replace(public.moderation_normalize(w.word), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M';
    IF norm ~ pattern THEN
      IF w.severity = 'reject' THEN
        RAISE EXCEPTION 'Ce texte contient un mot interdit par les règles de la communauté';
      ELSIF w.severity = 'mask' THEN
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
END; $function$