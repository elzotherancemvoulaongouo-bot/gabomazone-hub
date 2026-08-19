CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path text,
  media_type text CHECK (media_type IN ('image','video')),
  caption text,
  background text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT stories_require_content CHECK (media_path IS NOT NULL OR (caption IS NOT NULL AND length(btrim(caption)) > 0))
);

CREATE INDEX stories_active_idx ON public.stories (expires_at DESC, created_at DESC);
CREATE INDEX stories_user_idx ON public.stories (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories visibles par soi et ses amis"
ON public.stories FOR SELECT TO authenticated
USING (
  expires_at > now()
  AND (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id))
);

CREATE POLICY "Créer ses propres stories"
ON public.stories FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Modifier ses propres stories"
ON public.stories FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supprimer ses propres stories"
ON public.stories FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TABLE public.story_views (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses vues et celles de ses stories"
ON public.story_views FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid())
);

CREATE POLICY "Enregistrer ses propres vues"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;