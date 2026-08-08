-- PAGES
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  avatar_url text,
  cover_url text,
  category text,
  phone text,
  contact_email text,
  website text,
  city text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT SELECT ON public.pages TO anon;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.page_admins (
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_admins TO authenticated;
GRANT SELECT ON public.page_admins TO anon;
GRANT ALL ON public.page_admins TO service_role;
ALTER TABLE public.page_admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.page_followers (
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.page_followers TO authenticated;
GRANT SELECT ON public.page_followers TO anon;
GRANT ALL ON public.page_followers TO service_role;
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;

-- GROUPS
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  avatar_url text,
  cover_url text,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT ON public.groups TO anon;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT ON public.group_members TO anon;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer)
CREATE OR REPLACE FUNCTION public.is_page_admin(_page_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pages p WHERE p.id = _page_id AND p.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.page_admins a WHERE a.page_id = _page_id AND a.user_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_page_admin(uuid, uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = _group_id AND m.user_id = _user_id AND m.status = 'approved')
$$;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.group_members m WHERE m.group_id = _group_id AND m.user_id = _user_id AND m.status = 'approved' AND m.role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_group_public(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = _group_id AND g.is_private = false)
$$;
GRANT EXECUTE ON FUNCTION public.is_group_public(uuid) TO authenticated, anon, service_role;

-- Policies: pages
CREATE POLICY pages_public_read ON public.pages FOR SELECT USING (true);
CREATE POLICY pages_insert_owner ON public.pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY pages_update_admin ON public.pages FOR UPDATE TO authenticated USING (public.is_page_admin(id, auth.uid())) WITH CHECK (public.is_page_admin(id, auth.uid()));
CREATE POLICY pages_delete_owner ON public.pages FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY page_admins_public_read ON public.page_admins FOR SELECT USING (true);
CREATE POLICY page_admins_manage ON public.page_admins FOR INSERT TO authenticated WITH CHECK (public.is_page_admin(page_id, auth.uid()));
CREATE POLICY page_admins_delete ON public.page_admins FOR DELETE TO authenticated USING (public.is_page_admin(page_id, auth.uid()) OR auth.uid() = user_id);

CREATE POLICY page_followers_public_read ON public.page_followers FOR SELECT USING (true);
CREATE POLICY page_followers_insert_own ON public.page_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY page_followers_delete_own ON public.page_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies: groups
CREATE POLICY groups_public_read ON public.groups FOR SELECT USING (true);
CREATE POLICY groups_insert_owner ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY groups_update_admin ON public.groups FOR UPDATE TO authenticated USING (public.is_group_admin(id, auth.uid())) WITH CHECK (public.is_group_admin(id, auth.uid()));
CREATE POLICY groups_delete_owner ON public.groups FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY group_members_public_read ON public.group_members FOR SELECT USING (true);
CREATE POLICY group_members_insert_self ON public.group_members FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id AND role = 'member') OR public.is_group_admin(group_id, auth.uid()));
CREATE POLICY group_members_update_admin ON public.group_members FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid())) WITH CHECK (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY group_members_delete ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_group_admin(group_id, auth.uid()));

-- POSTS: attach to page or group
ALTER TABLE public.posts ADD COLUMN page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
CREATE INDEX posts_page_id_idx ON public.posts(page_id);
CREATE INDEX posts_group_id_idx ON public.posts(group_id);

DROP POLICY IF EXISTS posts_public_read ON public.posts;
CREATE POLICY posts_read ON public.posts FOR SELECT USING (
  group_id IS NULL
  OR public.is_group_public(group_id)
  OR public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own ON public.posts FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND (page_id IS NULL OR public.is_page_admin(page_id, auth.uid()))
  AND (group_id IS NULL OR public.is_group_member(group_id, auth.uid()))
);

DROP POLICY IF EXISTS posts_delete_own ON public.posts;
CREATE POLICY posts_delete_own ON public.posts FOR DELETE TO authenticated USING (
  auth.uid() = user_id
  OR (page_id IS NOT NULL AND public.is_page_admin(page_id, auth.uid()))
  OR (group_id IS NOT NULL AND public.is_group_admin(group_id, auth.uid()))
);

CREATE TRIGGER pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();