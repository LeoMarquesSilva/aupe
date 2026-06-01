-- Brand Kit estruturado para o Estúdio de Imagens.
-- Mantém os campos legados em clients, mas cria uma fonte de verdade mais rica por cliente.

CREATE TABLE IF NOT EXISTS public.client_brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_name text,
  tagline text,
  website_url text,
  instagram_handle text,
  brand_story text,
  audience text,
  value_proposition text,
  tone_of_voice text,
  visual_style text,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_headline text,
  font_body text,
  logo_usage text,
  words_to_use text,
  words_to_avoid text,
  hashtags text,
  prompt_guardrails text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_brand_kits_unique_client UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_brand_kits_org ON public.client_brand_kits(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_brand_kits_client ON public.client_brand_kits(client_id);

CREATE TABLE IF NOT EXISTS public.client_brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_kit_id uuid NOT NULL REFERENCES public.client_brand_kits(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (
    asset_type IN ('logo', 'logo_dark', 'logo_light', 'reference', 'product', 'background', 'template')
  ),
  label text,
  file_url text NOT NULL,
  storage_path text,
  mime_type text,
  file_size integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_brand_assets_org ON public.client_brand_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_brand_assets_kit ON public.client_brand_assets(brand_kit_id);
CREATE INDEX IF NOT EXISTS idx_client_brand_assets_client_type ON public.client_brand_assets(client_id, asset_type);

ALTER TABLE public.client_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_brand_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_brand_kits_select_policy ON public.client_brand_kits;
CREATE POLICY client_brand_kits_select_policy ON public.client_brand_kits
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_kits_insert_policy ON public.client_brand_kits;
CREATE POLICY client_brand_kits_insert_policy ON public.client_brand_kits
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_kits_update_policy ON public.client_brand_kits;
CREATE POLICY client_brand_kits_update_policy ON public.client_brand_kits
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_kits_delete_policy ON public.client_brand_kits;
CREATE POLICY client_brand_kits_delete_policy ON public.client_brand_kits
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_assets_select_policy ON public.client_brand_assets;
CREATE POLICY client_brand_assets_select_policy ON public.client_brand_assets
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_assets_insert_policy ON public.client_brand_assets;
CREATE POLICY client_brand_assets_insert_policy ON public.client_brand_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_assets_update_policy ON public.client_brand_assets;
CREATE POLICY client_brand_assets_update_policy ON public.client_brand_assets
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS client_brand_assets_delete_policy ON public.client_brand_assets;
CREATE POLICY client_brand_assets_delete_policy ON public.client_brand_assets
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE OR REPLACE FUNCTION public.set_client_brand_kit_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_brand_kits_updated_at ON public.client_brand_kits;
CREATE TRIGGER trg_client_brand_kits_updated_at
  BEFORE UPDATE ON public.client_brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_brand_kit_updated_at();

INSERT INTO public.client_brand_kits (
  organization_id,
  client_id,
  brand_name,
  instagram_handle,
  visual_style,
  primary_color,
  secondary_color,
  font_body,
  created_by
)
SELECT
  c.organization_id,
  c.id,
  c.name,
  c.instagram,
  c.brand_guidelines,
  c.brand_primary_color,
  c.brand_secondary_color,
  c.brand_font_notes,
  c.user_id
FROM public.clients c
WHERE (
  c.brand_guidelines IS NOT NULL
  OR c.brand_primary_color IS NOT NULL
  OR c.brand_secondary_color IS NOT NULL
  OR c.brand_font_notes IS NOT NULL
)
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO public.client_brand_assets (
  organization_id,
  brand_kit_id,
  client_id,
  asset_type,
  label,
  file_url,
  created_by
)
SELECT
  k.organization_id,
  k.id,
  k.client_id,
  'logo',
  'Logo principal',
  c.logo_url,
  k.created_by
FROM public.client_brand_kits k
JOIN public.clients c ON c.id = k.client_id
WHERE c.logo_url IS NOT NULL AND trim(c.logo_url) <> ''
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
