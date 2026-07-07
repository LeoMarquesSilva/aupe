-- Modo de produto por organização (full vs só aprovação) + bucket de logos de clientes

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS product_mode text NOT NULL DEFAULT 'full';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_product_mode_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_product_mode_check
  CHECK (product_mode IN ('full', 'approval_only'));

COMMENT ON COLUMN public.organizations.product_mode IS
  'full = produto completo; approval_only = apenas fluxo de aprovação (demais áreas bloqueadas na UI).';

-- Bucket público para logos de clientes (path: {organization_id}/{client_id}/...)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "client_logos_public_read" ON storage.objects;
CREATE POLICY "client_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-logos');

DROP POLICY IF EXISTS "client_logos_insert_own_org" ON storage.objects;
CREATE POLICY "client_logos_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (string_to_array(name, '/'))[1] = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "client_logos_update_own_org" ON storage.objects;
CREATE POLICY "client_logos_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (string_to_array(name, '/'))[1] = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (string_to_array(name, '/'))[1] = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "client_logos_delete_own_org" ON storage.objects;
CREATE POLICY "client_logos_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (string_to_array(name, '/'))[1] = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE OR REPLACE FUNCTION public.get_my_organization_product_mode()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(o.product_mode, 'full')
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_organization_product_mode() IS
  'Retorna product_mode da organização do usuário autenticado (full | approval_only).';

GRANT EXECUTE ON FUNCTION public.get_my_organization_product_mode() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_organization_product_mode(
  p_organization_id uuid,
  p_product_mode text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_product_mode NOT IN ('full', 'approval_only') THEN
    RAISE EXCEPTION 'product_mode inválido: %', p_product_mode;
  END IF;

  UPDATE public.organizations
  SET product_mode = p_product_mode, updated_at = now()
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_set_organization_product_mode(uuid, text) IS
  'Super admin: define product_mode da organização.';

GRANT EXECUTE ON FUNCTION public.admin_set_organization_product_mode(uuid, text) TO authenticated;
