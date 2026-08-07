
-- 1) Posts: media optional
ALTER TABLE public.posts ALTER COLUMN media_url DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN media_type DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN media_type DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.posts_require_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.media_url IS NULL OR btrim(NEW.media_url) = '')
     AND (NEW.caption IS NULL OR btrim(NEW.caption) = '') THEN
    RAISE EXCEPTION 'Une publication doit contenir du texte ou un média';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.posts_require_content() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS posts_require_content_trg ON public.posts;
CREATE TRIGGER posts_require_content_trg
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_require_content();

-- 2) Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message','friend_accepted','like','comment')),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  preview text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- author profile join
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_profile_fkey
  FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) Triggers producing notifications
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (owner_id, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, preview)
    VALUES (owner_id, NEW.user_id, 'comment', NEW.post_id, left(NEW.content, 120));
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid;
BEGIN
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END
    INTO recipient FROM public.conversations c WHERE c.id = NEW.conversation_id;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, conversation_id, preview)
    VALUES (recipient, NEW.sender_id, 'message', NEW.conversation_id,
            CASE WHEN NEW.kind = 'voice' THEN 'Note vocale' ELSE left(coalesce(NEW.content, ''), 120) END);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_friend_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND coalesce(OLD.status, '') <> 'accepted' THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.sender_id, NEW.receiver_id, 'friend_accepted');
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_friend_accepted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER likes_notify AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
CREATE TRIGGER comments_notify AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
CREATE TRIGGER friend_requests_notify AFTER UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_accepted();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
