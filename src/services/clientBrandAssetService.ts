import { supabase } from './supabaseClient';
import type { ClientBrandAsset, ClientBrandAssetType, ClientBrandKit } from '../types';

const BUCKET = 'client-brand-assets';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/svg+xml') return 'svg';
  return 'img';
}

async function getOrgAndUser(): Promise<{ organizationId: string; userId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (error || !profile?.organization_id) {
    throw new Error('Organização não encontrada');
  }
  return { organizationId: profile.organization_id as string, userId: user.id };
}

function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

function mapKit(row: any, assets: ClientBrandAsset[] = []): ClientBrandKit {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    brandName: row.brand_name ?? undefined,
    tagline: row.tagline ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    instagramHandle: row.instagram_handle ?? undefined,
    brandStory: row.brand_story ?? undefined,
    audience: row.audience ?? undefined,
    valueProposition: row.value_proposition ?? undefined,
    toneOfVoice: row.tone_of_voice ?? undefined,
    visualStyle: row.visual_style ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    secondaryColor: row.secondary_color ?? undefined,
    accentColor: row.accent_color ?? undefined,
    fontHeadline: row.font_headline ?? undefined,
    fontBody: row.font_body ?? undefined,
    logoUsage: row.logo_usage ?? undefined,
    wordsToUse: row.words_to_use ?? undefined,
    wordsToAvoid: row.words_to_avoid ?? undefined,
    hashtags: row.hashtags ?? undefined,
    promptGuardrails: row.prompt_guardrails ?? undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    assets,
  };
}

function mapAsset(row: any): ClientBrandAsset {
  return {
    id: row.id,
    organizationId: row.organization_id,
    brandKitId: row.brand_kit_id,
    clientId: row.client_id,
    assetType: row.asset_type,
    label: row.label ?? undefined,
    fileUrl: row.file_url,
    storagePath: row.storage_path ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ?? undefined,
  };
}

function kitToDb(kit: ClientBrandKit, organizationId: string, userId: string) {
  return {
    organization_id: organizationId,
    client_id: kit.clientId,
    brand_name: emptyToNull(kit.brandName),
    tagline: emptyToNull(kit.tagline),
    website_url: emptyToNull(kit.websiteUrl),
    instagram_handle: emptyToNull(kit.instagramHandle),
    brand_story: emptyToNull(kit.brandStory),
    audience: emptyToNull(kit.audience),
    value_proposition: emptyToNull(kit.valueProposition),
    tone_of_voice: emptyToNull(kit.toneOfVoice),
    visual_style: emptyToNull(kit.visualStyle),
    primary_color: emptyToNull(kit.primaryColor),
    secondary_color: emptyToNull(kit.secondaryColor),
    accent_color: emptyToNull(kit.accentColor),
    font_headline: emptyToNull(kit.fontHeadline),
    font_body: emptyToNull(kit.fontBody),
    logo_usage: emptyToNull(kit.logoUsage),
    words_to_use: emptyToNull(kit.wordsToUse),
    words_to_avoid: emptyToNull(kit.wordsToAvoid),
    hashtags: emptyToNull(kit.hashtags),
    prompt_guardrails: emptyToNull(kit.promptGuardrails),
    is_active: kit.isActive !== false,
    created_by: userId,
  };
}

export const clientBrandAssetService = {
  async getBrandKit(clientId: string): Promise<ClientBrandKit | null> {
    const { organizationId } = await getOrgAndUser();
    const { data: kit, error } = await supabase
      .from('client_brand_kits')
      .select('*')
      .eq('client_id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Erro ao buscar Brand Kit');
    if (!kit) return null;

    const assets = await this.listBrandAssets(kit.id);
    return mapKit(kit, assets);
  },

  async saveBrandKit(kit: ClientBrandKit): Promise<ClientBrandKit> {
    const { organizationId, userId } = await getOrgAndUser();
    const payload = kitToDb(kit, organizationId, userId);

    const { data, error } = await supabase
      .from('client_brand_kits')
      .upsert(payload, { onConflict: 'client_id' })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao salvar Brand Kit');
    }

    const saved = mapKit(data);

    await supabase
      .from('clients')
      .update({
        brand_guidelines: payload.visual_style || payload.brand_story || payload.tone_of_voice,
        brand_primary_color: payload.primary_color,
        brand_secondary_color: payload.secondary_color,
        brand_font_notes: [payload.font_headline, payload.font_body].filter(Boolean).join(' / ') || null,
        logo_url:
          kit.assets?.find((asset) => asset.assetType === 'logo')?.fileUrl ||
          kit.assets?.find((asset) => asset.assetType === 'logo_light')?.fileUrl ||
          undefined,
      })
      .eq('id', kit.clientId)
      .eq('organization_id', organizationId);

    return { ...saved, assets: await this.listBrandAssets(saved.id!) };
  },

  async listBrandAssets(brandKitId: string): Promise<ClientBrandAsset[]> {
    const { organizationId } = await getOrgAndUser();
    const { data, error } = await supabase
      .from('client_brand_assets')
      .select('*')
      .eq('brand_kit_id', brandKitId)
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message || 'Erro ao buscar assets da marca');
    return (data || []).map(mapAsset);
  },

  async uploadBrandAsset(
    file: File,
    clientId: string,
    brandKitId: string,
    assetType: ClientBrandAssetType,
    label?: string,
  ): Promise<ClientBrandAsset> {
    if (!ALLOWED.has(file.type)) {
      throw new Error('Use PNG, JPG, WebP, GIF ou SVG.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Arquivo muito grande (máx. 5 MB).');
    }

    const { organizationId, userId } = await getOrgAndUser();
    const ext = extFromMime(file.type || 'image/jpeg');
    const fileName = `${assetType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = `${organizationId}/${clientId}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

    if (upErr) throw new Error(upErr.message || 'Erro ao enviar o asset');

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const { data, error } = await supabase
      .from('client_brand_assets')
      .insert({
        organization_id: organizationId,
        brand_kit_id: brandKitId,
        client_id: clientId,
        asset_type: assetType,
        label: emptyToNull(label) || file.name,
        file_url: pub.publicUrl,
        storage_path: filePath,
        mime_type: file.type || null,
        file_size: file.size,
        created_by: userId,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao salvar asset da marca');

    if (assetType === 'logo') {
      await supabase
        .from('clients')
        .update({ logo_url: pub.publicUrl })
        .eq('id', clientId)
        .eq('organization_id', organizationId);
    }

    return mapAsset(data);
  },

  async deleteBrandAsset(asset: ClientBrandAsset): Promise<void> {
    const { organizationId } = await getOrgAndUser();
    const { error } = await supabase
      .from('client_brand_assets')
      .delete()
      .eq('id', asset.id)
      .eq('organization_id', organizationId);

    if (error) throw new Error(error.message || 'Erro ao excluir asset da marca');

    if (asset.storagePath) {
      await supabase.storage.from(BUCKET).remove([asset.storagePath]);
    }
  },

  async uploadBriefBackgroundImage(file: File, clientId: string): Promise<{ publicUrl: string; path: string }> {
    if (!ALLOWED.has(file.type)) {
      throw new Error('Use PNG, JPG, WebP, GIF ou SVG.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Arquivo muito grande (máx. 5 MB).');
    }

    const { organizationId } = await getOrgAndUser();
    const ext = extFromMime(file.type || 'image/jpeg');
    const fileName = `brief-background-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = `${organizationId}/${clientId}/briefs/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

    if (upErr) throw new Error(upErr.message || 'Erro ao enviar imagem de fundo');

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return { publicUrl: pub.publicUrl, path: filePath };
  },

  /**
   * Upload de logo do cliente para `client-brand-assets/{org}/{client}/...`
   */
  async uploadClientLogo(file: File, clientId: string): Promise<string> {
    if (!ALLOWED.has(file.type)) {
      throw new Error('Use PNG, JPG, WebP, GIF ou SVG.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Arquivo muito grande (máx. 5 MB).');
    }
    const { organizationId } = await getOrgAndUser();
    const ext = extFromMime(file.type || 'image/jpeg');
    const fileName = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = `${organizationId}/${clientId}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

    if (upErr) throw new Error(upErr.message || 'Erro ao enviar a logo');

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return pub.publicUrl;
  },
};
