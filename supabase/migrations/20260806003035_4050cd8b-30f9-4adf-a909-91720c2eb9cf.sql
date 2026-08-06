CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct CHECK (user_a <> user_b),
  CONSTRAINT conversations_ordered CHECK (user_a < user_b),
  CONSTRAINT conversations_unique_pair UNIQUE (user_a, user_b)
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_participant ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY conversations_insert_friends ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_a OR auth.uid() = user_b) AND public.are_friends(user_a, user_b));

CREATE POLICY conversations_update_participant ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id AND (c.user_a = _user_id OR c.user_b = _user_id)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  content text,
  audio_path text,
  duration_seconds integer,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_kind_check CHECK (kind IN ('text','voice')),
  CONSTRAINT messages_payload_check CHECK (
    (kind = 'text' AND content IS NOT NULL AND length(btrim(content)) > 0)
    OR (kind = 'voice' AND audio_path IS NOT NULL)
  )
);

CREATE INDEX messages_conversation_created_idx ON public.messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_participant ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY messages_update_participant ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY messages_delete_own ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;