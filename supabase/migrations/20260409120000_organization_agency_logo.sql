-- Organization agency logo URL + public storage bucket for uploads (path: {organization_id}/...)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS agency_logo_url text;

COMMENT ON COLUMN public.organizations.agency_logo_url IS 'Public URL of the agency logo (white-label branding).';

-- Bucket: public read so links work on approval/dashboard pages without auth
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "organization_logos_public_read" ON storage.objects;
CREATE POLICY "organization_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "organization_logos_insert_own_org" ON storage.objects;
CREATE POLICY "organization_logos_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "organization_logos_update_own_org" ON storage.objects;
CREATE POLICY "organization_logos_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "organization_logos_delete_own_org" ON storage.objects;
CREATE POLICY "organization_logos_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Safe update from app without relying on broad organizations UPDATE RLS
CREATE OR REPLACE FUNCTION public.update_my_organization_agency_logo(p_agency_logo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organização não encontrada para o usuário';
  END IF;
  UPDATE public.organizations
  SET
    agency_logo_url = NULLIF(trim(p_agency_logo_url), ''),
    updated_at = now()
  WHERE id = v_org;
END;
$$;

COMMENT ON FUNCTION public.update_my_organization_agency_logo(text) IS 'Sets organizations.agency_logo_url for the caller organization (authenticated).';

GRANT EXECUTE ON FUNCTION public.update_my_organization_agency_logo(text) TO authenticated;
