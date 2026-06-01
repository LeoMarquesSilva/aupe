-- Brand fields for AI image studio (per client / organization-scoped via existing clients RLS)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_guidelines text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_primary_color text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_secondary_color text;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_font_notes text;

COMMENT ON COLUMN public.clients.brand_guidelines IS 'Free-text visual/voice guidelines for on-brand image generation.';
COMMENT ON COLUMN public.clients.brand_primary_color IS 'Optional primary brand color (e.g. hex).';
COMMENT ON COLUMN public.clients.brand_secondary_color IS 'Optional secondary/accent color (e.g. hex).';
COMMENT ON COLUMN public.clients.brand_font_notes IS 'Optional typography notes for generation prompts.';

-- Public bucket: paths {organization_id}/{client_id}/...
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-brand-assets',
  'client-brand-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "client_brand_assets_public_read" ON storage.objects;
CREATE POLICY "client_brand_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-brand-assets');

DROP POLICY IF EXISTS "client_brand_assets_insert_own_org" ON storage.objects;
CREATE POLICY "client_brand_assets_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-brand-assets'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "client_brand_assets_update_own_org" ON storage.objects;
CREATE POLICY "client_brand_assets_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-brand-assets'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    bucket_id = 'client-brand-assets'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "client_brand_assets_delete_own_org" ON storage.objects;
CREATE POLICY "client_brand_assets_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-brand-assets'
    AND (string_to_array(name, '/'))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

NOTIFY pgrst, 'reload schema';
