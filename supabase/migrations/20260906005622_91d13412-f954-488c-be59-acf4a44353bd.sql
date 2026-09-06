DROP TRIGGER IF EXISTS messages_notify ON public.messages;
DROP FUNCTION IF EXISTS public.notify_on_message();
DELETE FROM public.notifications WHERE type = 'message';