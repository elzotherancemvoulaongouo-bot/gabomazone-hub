ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS action_buttons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

CREATE TABLE public.community_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((page_id IS NULL) <> (group_id IS NULL))
);
CREATE UNIQUE INDEX community_invites_page_uq ON public.community_invites(invitee_id, page_id) WHERE page_id IS NOT NULL;
CREATE UNIQUE INDEX community_invites_group_uq ON public.community_invites(invitee_id, group_id) WHERE group_id IS NOT NULL;
GRANT SELECT, INSERT, DELETE ON public.community_invites TO authenticated;
GRANT ALL ON public.community_invites TO service_role;
ALTER TABLE public.community_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_select ON public.community_invites FOR SELECT TO authenticated USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY ci_insert ON public.community_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id AND public.are_friends(inviter_id, invitee_id));
CREATE POLICY ci_delete ON public.community_invites FOR DELETE TO authenticated USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE OR REPLACE FUNCTION public.notify_on_community_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, page_id, group_id, preview)
  VALUES (NEW.invitee_id, NEW.inviter_id,
    CASE WHEN NEW.page_id IS NOT NULL THEN 'page_invite' ELSE 'group_invite' END,
    NEW.page_id, NEW.group_id,
    coalesce((SELECT name FROM public.pages WHERE id = NEW.page_id), (SELECT name FROM public.groups WHERE id = NEW.group_id)));
  RETURN NEW;
END; $$;
CREATE TRIGGER community_invites_notify AFTER INSERT ON public.community_invites FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_invite();

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_insert ON public.community_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY cr_select ON public.community_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

CREATE TABLE public.community_user_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  flag text NOT NULL CHECK (flag IN ('saved','blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cuf_uq ON public.community_user_flags(user_id, flag, coalesce(page_id, group_id));
GRANT SELECT, INSERT, DELETE ON public.community_user_flags TO authenticated;
GRANT ALL ON public.community_user_flags TO service_role;
ALTER TABLE public.community_user_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY cuf_all ON public.community_user_flags FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);