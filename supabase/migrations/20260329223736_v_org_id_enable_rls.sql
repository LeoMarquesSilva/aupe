-- Corrige advisory Supabase: RLS em public.v_org_id (tabela exposta ao PostgREST).
-- Coluna única: organization_id. Acesso alinhado ao restante do schema (org + super_admin).

ALTER TABLE public.v_org_id ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v_org_id_select_policy ON public.v_org_id;
DROP POLICY IF EXISTS v_org_id_insert_policy ON public.v_org_id;
DROP POLICY IF EXISTS v_org_id_update_policy ON public.v_org_id;
DROP POLICY IF EXISTS v_org_id_delete_policy ON public.v_org_id;

CREATE POLICY v_org_id_select_policy ON public.v_org_id
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY v_org_id_insert_policy ON public.v_org_id
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY v_org_id_update_policy ON public.v_org_id
  FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY v_org_id_delete_policy ON public.v_org_id
  FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );
