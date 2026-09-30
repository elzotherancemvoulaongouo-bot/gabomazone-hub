CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report users as self" ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND reported_id <> auth.uid());
CREATE POLICY "See own user reports" ON public.user_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());