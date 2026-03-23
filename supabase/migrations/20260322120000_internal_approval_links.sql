-- Public token links for internal (gestor) pre-approval, parallel to client approval_requests.

CREATE TABLE IF NOT EXISTS public.internal_approval_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_internal_approval_links_token ON public.internal_approval_links(token);
CREATE INDEX IF NOT EXISTS idx_internal_approval_links_org ON public.internal_approval_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_approval_links_expires_at ON public.internal_approval_links(expires_at);

CREATE TABLE IF NOT EXISTS public.internal_approval_link_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_approval_link_id uuid NOT NULL REFERENCES public.internal_approval_links(id) ON DELETE CASCADE,
  scheduled_post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE(internal_approval_link_id, scheduled_post_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_approval_link_posts_link ON public.internal_approval_link_posts(internal_approval_link_id);
CREATE INDEX IF NOT EXISTS idx_internal_approval_link_posts_post ON public.internal_approval_link_posts(scheduled_post_id);

COMMENT ON TABLE public.internal_approval_links IS 'Tokenized batch link for gestor internal pre-approval (no login)';
COMMENT ON TABLE public.internal_approval_link_posts IS 'Posts included in an internal approval link';

-- Integrity: post organization must match link organization
CREATE OR REPLACE FUNCTION public.check_internal_approval_link_post_org_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  link_org uuid;
  post_org uuid;
BEGIN
  SELECT organization_id INTO link_org FROM public.internal_approval_links WHERE id = NEW.internal_approval_link_id;
  SELECT organization_id INTO post_org FROM public.scheduled_posts WHERE id = NEW.scheduled_post_id;
  IF link_org IS NULL OR post_org IS NULL OR link_org <> post_org THEN
    RAISE EXCEPTION 'internal_approval_link_posts: post organization_id must match link organization_id'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS internal_approval_link_posts_org_match_trigger ON public.internal_approval_link_posts;
CREATE TRIGGER internal_approval_link_posts_org_match_trigger
  BEFORE INSERT OR UPDATE ON public.internal_approval_link_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_internal_approval_link_post_org_match();

ALTER TABLE public.internal_approval_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_approval_link_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY internal_approval_links_select_policy ON public.internal_approval_links
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY internal_approval_links_insert_policy ON public.internal_approval_links
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY internal_approval_links_update_policy ON public.internal_approval_links
  FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY internal_approval_links_delete_policy ON public.internal_approval_links
  FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY internal_approval_link_posts_select_policy ON public.internal_approval_link_posts
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR internal_approval_link_id IN (
      SELECT ial.id FROM public.internal_approval_links ial
      WHERE ial.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY internal_approval_link_posts_insert_policy ON public.internal_approval_link_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR internal_approval_link_id IN (
      SELECT ial.id FROM public.internal_approval_links ial
      WHERE ial.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY internal_approval_link_posts_update_policy ON public.internal_approval_link_posts
  FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR internal_approval_link_id IN (
      SELECT ial.id FROM public.internal_approval_links ial
      WHERE ial.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY internal_approval_link_posts_delete_policy ON public.internal_approval_link_posts
  FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR internal_approval_link_id IN (
      SELECT ial.id FROM public.internal_approval_links ial
      WHERE ial.organization_id = get_user_organization_id()
    )
  );

CREATE OR REPLACE FUNCTION public.create_internal_approval_link_atomic(
  p_post_ids uuid[],
  p_expires_in_days integer,
  p_label text,
  p_token text
)
RETURNS TABLE(id uuid, token text, expires_at timestamptz, label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link_id uuid;
  v_expires_at timestamptz;
  v_uid uuid;
  v_org uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_post_ids IS NULL OR array_length(p_post_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um post.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_expires_in_days NOT IN (7, 15, 30) THEN
    RAISE EXCEPTION 'Validade inválida. Use 7, 15 ou 30 dias.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT sp.organization_id INTO v_org
  FROM public.scheduled_posts sp
  WHERE sp.id = p_post_ids[1];

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Post inválido ou sem organização.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT (
    is_super_admin(v_uid)
    OR get_user_organization_id() = v_org
  ) THEN
    RAISE EXCEPTION 'Sem permissão para esta organização.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_post_ids) AS pid
    LEFT JOIN public.scheduled_posts sp ON sp.id = pid
    WHERE sp.id IS NULL
      OR sp.organization_id IS DISTINCT FROM v_org
      OR sp.status <> 'pending'
  ) THEN
    RAISE EXCEPTION 'Um ou mais posts são inválidos (organização ou status).'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.scheduled_posts sp
    WHERE sp.id = ANY(p_post_ids)
      AND NOT (
        COALESCE(sp.requires_internal_approval, false) = true
        AND (
          sp.internal_approval_status IS NULL
          OR sp.internal_approval_status = 'pending'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Todos os posts devem exigir revisão interna e estar pendentes de aprovação do gestor.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.internal_approval_link_posts ialp
    JOIN public.internal_approval_links ial ON ial.id = ialp.internal_approval_link_id
    WHERE ialp.scheduled_post_id = ANY(p_post_ids)
      AND ial.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Um ou mais posts já estão em um link interno ativo.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_expires_at := now() + make_interval(days => p_expires_in_days);

  INSERT INTO public.internal_approval_links (organization_id, token, expires_at, label, created_by)
  VALUES (v_org, p_token, v_expires_at, NULLIF(trim(coalesce(p_label, '')), ''), v_uid)
  RETURNING internal_approval_links.id INTO v_link_id;

  INSERT INTO public.internal_approval_link_posts (internal_approval_link_id, scheduled_post_id, sort_order)
  SELECT
    v_link_id,
    pid,
    ord - 1
  FROM unnest(p_post_ids) WITH ORDINALITY AS x(pid, ord);

  RETURN QUERY
  SELECT ial.id, ial.token, ial.expires_at, ial.label
  FROM public.internal_approval_links ial
  WHERE ial.id = v_link_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_internal_approval_link_atomic(uuid[], integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_internal_approval_link_atomic(uuid[], integer, text, text) TO authenticated;
