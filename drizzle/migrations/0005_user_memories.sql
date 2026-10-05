CREATE TABLE public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_memories_user_idx ON public.user_memories (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memories TO authenticated;
GRANT ALL ON public.user_memories TO service_role;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memories" ON public.user_memories FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());