CREATE OR REPLACE FUNCTION public.can_access_reports(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'administrador') OR public.has_role(_user_id,'gerente') OR public.has_agent_access(_user_id,'ejecutiva')
$$;

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  report_date date NOT NULL DEFAULT current_date,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size bigint NOT NULL DEFAULT 0,
  content text,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports read" ON public.reports FOR SELECT TO authenticated USING (public.can_access_reports(auth.uid()));
CREATE POLICY "reports insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (public.can_access_reports(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "reports delete" ON public.reports FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'administrador'));
CREATE INDEX reports_date_idx ON public.reports (report_date DESC, created_at DESC);

CREATE TABLE public.report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.report_requests TO authenticated;
GRANT ALL ON public.report_requests TO service_role;
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr read" ON public.report_requests FOR SELECT TO authenticated USING (public.can_access_reports(auth.uid()));
CREATE POLICY "rr insert" ON public.report_requests FOR INSERT TO authenticated WITH CHECK (public.can_access_reports(auth.uid()) AND requested_by = auth.uid());
CREATE POLICY "rr update" ON public.report_requests FOR UPDATE TO authenticated USING (public.can_access_reports(auth.uid()));

CREATE POLICY "reports files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reports' AND public.can_access_reports(auth.uid()));
CREATE POLICY "reports files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports' AND public.can_access_reports(auth.uid()));
CREATE POLICY "reports files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reports' AND public.can_access_reports(auth.uid()));