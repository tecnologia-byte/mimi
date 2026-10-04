CREATE TABLE public.knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge read" ON public.knowledge_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "knowledge insert" ON public.knowledge_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "knowledge update" ON public.knowledge_entries FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "knowledge delete" ON public.knowledge_entries FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'administrador'));

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites select" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own favorites insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own favorites delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);