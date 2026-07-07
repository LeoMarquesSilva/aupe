import { supabase } from './supabaseClient';
import { clientService } from './supabaseClient';

const BUCKET = 'client-logos';
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return 'img';
}

export function pathFromClientLogoPublicUrl(publicUrl: string | null | undefined): string | null {
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

export const clientLogoService = {
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

  async uploadClientLogo(
    clientId: string,
    file: File,
    previousPublicUrl?: string | null
  ): Promise<string> {
    if (!ALLOWED.has(file.type)) {
      throw new Error('Use PNG, JPG, WebP ou GIF.');
    }
    if (file.size > MAX_BYTES) {
      throw new Error('Arquivo muito grande (máx. 2 MB).');
    }

    const orgId = await this.getCurrentOrganizationId();
    const ext = extFromMime(file.type || 'image/jpeg');
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const filePath = `${orgId}/${clientId}/${fileName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (upErr) throw new Error(upErr.message || 'Erro ao enviar a logo');

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = pub.publicUrl;

    await clientService.updateClient({ id: clientId, logoUrl: publicUrl });

    const prevPath = pathFromClientLogoPublicUrl(previousPublicUrl ?? null);
    if (prevPath && prevPath !== filePath) {
      await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {});
    }

    return publicUrl;
  },

  async clearClientLogo(clientId: string, currentPublicUrl?: string | null): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', clientId);
    if (error) throw new Error(error.message || 'Erro ao remover a logo');

    const path = pathFromClientLogoPublicUrl(currentPublicUrl);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  },
};
