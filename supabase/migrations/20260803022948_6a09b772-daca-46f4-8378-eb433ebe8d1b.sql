
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX posts_user_id_idx ON public.posts (user_id);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_public_read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_id_idx ON public.comments (post_id, created_at);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name text;
  final_name text;
  suffix int := 0;
BEGIN
  base_name := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'membre'), '[^a-z0-9_]', '', 'g'));
  IF base_name = '' THEN base_name := 'membre'; END IF;
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    suffix := suffix + 1;
    final_name := base_name || suffix::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_name, coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_name), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
