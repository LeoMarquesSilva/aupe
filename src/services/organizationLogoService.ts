import { supabase } from './supabaseClient';

const BUCKET = 'organization-logos';
const MAX_BYTES = 2 * 1024 * 1024;
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

/** Extract storage path from public URL for this bucket (for delete). */
export function pathFromOrganizationLogoPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl || !publicUrl.includes(`/storage/v1/object/public/${BUCKET}/`)) return null;
  try {
    const u = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    const i = u.pathname.indexOf(prefix);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + prefix.length));
  } catch {
    return null;
  }
}

export const organizationLogoService = {
  async getCurrentOrganizationId(): Promise<string> {
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
    return profile.organization_id as string;
  },

  async uploadAgencyLogo(file: File, previousPublicUrl?: string | null): Promise<string> {
    if (!ALLOWED.has(file.type)) {
      throw new Error('Use PNG, JPG, WebP, GIF ou SVG.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Arquivo muito grande (máx. 2 MB).');
    }
    const orgId = await this.getCurrentOrganizationId();
    const ext = extFromMime(file.type || 'image/jpeg');
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = `${orgId}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

    if (upErr) throw new Error(upErr.message || 'Erro ao enviar a imagem');

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = pub.publicUrl;

    const { error: rpcErr } = await supabase.rpc('update_my_organization_agency_logo', {
      p_agency_logo_url: publicUrl,
    });
    if (rpcErr) {
      await supabase.storage.from(BUCKET).remove([filePath]).catch(() => {});
      throw new Error(rpcErr.message || 'Erro ao salvar a URL da logo');
    }

    const prevPath = pathFromOrganizationLogoPublicUrl(previousPublicUrl ?? null);
    if (prevPath && prevPath !== filePath) {
      await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {});
    }

    return publicUrl;
  },

  /** Remove logo from DB and try to delete object from storage. */
  async clearAgencyLogo(currentPublicUrl: string | null | undefined): Promise<void> {
    const path = pathFromOrganizationLogoPublicUrl(currentPublicUrl);
    const { error: rpcErr } = await supabase.rpc('update_my_organization_agency_logo', {
      p_agency_logo_url: '',
    });
    if (rpcErr) throw new Error(rpcErr.message || 'Erro ao remover a logo');
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  },
};
