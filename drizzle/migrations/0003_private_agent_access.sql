ALTER TABLE public.access_requests ADD COLUMN agent text NOT NULL DEFAULT 'ejecutiva'
  CHECK (agent IN ('contadora','logistica','ejecutiva','milt'));
ALTER TABLE public.access_requests ADD COLUMN reason text;

CREATE TABLE public.agent_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent text NOT NULL CHECK (agent IN ('contadora','logistica','ejecutiva','milt')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent)
);
GRANT SELECT ON public.agent_access TO authenticated;
GRANT ALL ON public.agent_access TO service_role;
ALTER TABLE public.agent_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read agent access" ON public.agent_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'administrador'));

CREATE OR REPLACE FUNCTION public.has_agent_access(_user_id uuid, _agent text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _agent = 'mimi'
    OR public.has_role(_user_id,'administrador')
    OR EXISTS (SELECT 1 FROM public.agent_access WHERE user_id = _user_id AND agent = _agent)
$$;

CREATE OR REPLACE FUNCTION public.admin_set_agent_access(_user_id uuid, _agent text, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'administrador') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _grant THEN
    INSERT INTO public.agent_access(user_id, agent, granted_by) VALUES (_user_id, _agent, auth.uid()) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.agent_access WHERE user_id = _user_id AND agent = _agent;
  END IF;
  INSERT INTO public.role_audit(actor_id, target_id, action)
    VALUES (auth.uid(), _user_id, CASE WHEN _grant THEN 'dio acceso a ' ELSE 'quitó acceso a ' END || _agent);
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_request(_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.access_requests;
BEGIN
  IF NOT public.has_role(auth.uid(),'administrador') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO req FROM public.access_requests WHERE id = _id AND status = 'pendiente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  UPDATE public.access_requests SET status = CASE WHEN _approve THEN 'aprobada' ELSE 'rechazada' END,
    resolved_at = now(), resolved_by = auth.uid() WHERE id = _id;
  IF _approve THEN
    INSERT INTO public.agent_access(user_id, agent, granted_by) VALUES (req.user_id, req.agent, auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.role_audit(actor_id, target_id, action)
    VALUES (auth.uid(), req.user_id, CASE WHEN _approve THEN 'aprobó ' ELSE 'rechazó ' END || req.agent);
END $$;

CREATE OR REPLACE FUNCTION public.admin_agent_access_list()
RETURNS TABLE(user_id uuid, agent text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'administrador') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT a.user_id, a.agent FROM public.agent_access a;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_agent_access(uuid, text), public.admin_set_agent_access(uuid, text, boolean),
  public.admin_agent_access_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_agent_access(uuid, text), public.admin_set_agent_access(uuid, text, boolean),
  public.admin_agent_access_list() TO authenticated;