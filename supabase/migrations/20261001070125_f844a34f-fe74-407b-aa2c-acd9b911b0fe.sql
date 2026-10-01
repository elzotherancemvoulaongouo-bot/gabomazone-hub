CREATE TABLE public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE actor_name text;
BEGIN
  SELECT coalesce(display_name, username) INTO actor_name FROM public.profiles WHERE id = NEW.actor_id;
  PERFORM net.http_post(
    url := 'https://project--028a73e5-7b8e-4e4b-b688-1631b969fd9d.lovable.app/api/public/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-signature', 'a898d4885a9e8fb32ab46f4a40d0d070100f0992d7720341b14279c19656554b'),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'type', NEW.type,
      'preview', NEW.preview,
      'actor', actor_name,
      'post_id', NEW.post_id,
      'conversation_id', NEW.conversation_id,
      'page_id', NEW.page_id,
      'group_id', NEW.group_id
    )
  );
  RETURN NEW;
END; $function$;

CREATE TRIGGER notifications_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notify_push();