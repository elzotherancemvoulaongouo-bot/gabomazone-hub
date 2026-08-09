-- 1. user settings
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  post_visibility text NOT NULL DEFAULT 'public',
  who_can_message text NOT NULL DEFAULT 'everyone',
  who_can_friend_request text NOT NULL DEFAULT 'everyone',
  notif_messages boolean NOT NULL DEFAULT true,
  notif_likes boolean NOT NULL DEFAULT true,
  notif_comments boolean NOT NULL DEFAULT true,
  notif_friends boolean NOT NULL DEFAULT true,
  feed_sort text NOT NULL DEFAULT 'recent',
  autoplay_videos boolean NOT NULL DEFAULT true,
  data_saver boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'fr',
  theme text NOT NULL DEFAULT 'dark',
  font_size text NOT NULL DEFAULT 'normal',
  reduce_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_post_visibility_chk CHECK (post_visibility IN ('public','friends','only_me')),
  CONSTRAINT user_settings_who_msg_chk CHECK (who_can_message IN ('everyone','friends')),
  CONSTRAINT user_settings_who_fr_chk CHECK (who_can_friend_request IN ('everyone','friends_of_friends','nobody')),
  CONSTRAINT user_settings_feed_sort_chk CHECK (feed_sort IN ('recent','friends_first')),
  CONSTRAINT user_settings_theme_chk CHECK (theme IN ('dark','light','system')),
  CONSTRAINT user_settings_font_chk CHECK (font_size IN ('small','normal','large'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_settings_own ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. saved posts
CREATE TABLE public.saved_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_posts_own ON public.saved_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. hidden posts
CREATE TABLE public.hidden_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.hidden_posts TO authenticated;
GRANT ALL ON public.hidden_posts TO service_role;
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY hidden_posts_own ON public.hidden_posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. blocks
CREATE TABLE public.blocked_users (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocked_users_not_self CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocked_users_own ON public.blocked_users FOR ALL TO authenticated
  USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- 5. reports
CREATE TABLE public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
GRANT SELECT, INSERT ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_reports_insert_own ON public.post_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY post_reports_select_own ON public.post_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- 6. multi media
CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_media_post_id_idx ON public.post_media(post_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_media TO authenticated;
GRANT SELECT ON public.post_media TO anon;
GRANT ALL ON public.post_media TO service_role;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_media_read ON public.post_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id));
CREATE POLICY post_media_write_owner ON public.post_media FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

-- 7. post visibility
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_chk CHECK (visibility IN ('public','friends','only_me'));

DROP POLICY IF EXISTS posts_read ON public.posts;
CREATE POLICY posts_read ON public.posts FOR SELECT TO anon, authenticated
USING (
  (group_id IS NULL OR public.is_group_public(group_id) OR public.is_group_member(group_id, auth.uid()))
  AND (
    visibility = 'public'
    OR page_id IS NOT NULL
    OR group_id IS NOT NULL
    OR auth.uid() = user_id
    OR (visibility = 'friends' AND auth.uid() IS NOT NULL AND public.are_friends(user_id, auth.uid()))
  )
);