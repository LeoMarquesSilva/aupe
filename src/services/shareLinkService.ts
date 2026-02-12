import { supabase } from './supabaseClient';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';

export interface ClientShareLink {
  id: string;
  clientId: string;
  token: string;
  expiresAt: string;
  label: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface CreateShareLinkResult {
  id: string;
  token: string;
  expiresAt: string;
  url: string;
  label: string | null;
}

function generateToken(): string {
  const part1 = crypto.randomUUID().replace(/-/g, '');
  const part2 = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return part1 + part2;
}

/**
 * Gera a URL pública para visualização do dashboard pelo cliente
 */
export function getShareLinkUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/view/${encodeURIComponent(token)}`;
}

/**
 * Cria um novo link de compartilhamento temporário para o cliente
 */
export async function createShareLink(
  clientId: string,
  expiresInDays: number,
  label?: string
): Promise<CreateShareLinkResult> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from('client_share_links')
    .insert({
      client_id: clientId,
      token,
      expires_at: expiresAt.toISOString(),
      label: label || null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select('id, token, expires_at, label')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Falha ao criar link.');

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    url: `${base}/view/${encodeURIComponent(data.token)}`,
    label: data.label,
  };
}

/**
 * Lista todos os links ativos para um cliente
 */
export async function listShareLinks(clientId: string): Promise<ClientShareLink[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('client_share_links')
    .select('id, client_id, token, expires_at, label, created_at, created_by')
    .eq('client_id', clientId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    token: row.token,
    expiresAt: row.expires_at,
    label: row.label,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

/**
 * Revoga (remove) um link de compartilhamento
 */
export async function revokeShareLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('client_share_links').delete().eq('id', linkId);
  if (error) throw error;
}

/**
 * Busca dados do dashboard para exibição pública (via token).
 * Chama a Edge Function do Supabase.
 */
export async function fetchDashboardByToken(token: string): Promise<{
  client: { id: string; name: string; instagram: string; logoUrl?: string; profilePicture?: string };
  profile: unknown;
  posts: unknown[];
  cacheStatus: {
    clientId: string;
    lastFullSync: string | null;
    postsCount: number;
    syncStatus: string;
    errorMessage?: string;
  };
  expiresAt: string;
}> {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('REACT_APP_SUPABASE_URL não está configurada. Configure no arquivo .env e reinicie o app.');
  }
  // Nome exato da função no Supabase (no seu deploy está com hífen no final)
  const functionName = 'get-client-dashboard-by-token-';
  const url = `${supabaseUrl}/functions/v1/${functionName}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'GET' });
  let body: { error?: string } = {};
  try {
    body = await res.json();
  } catch {
    body = { error: res.status === 404 ? 'Link inválido ou expirado.' : 'Erro ao carregar dados.' };
  }
  if (!res.ok) {
    throw new Error(body?.error || 'Link inválido ou expirado.');
  }
  return body as Awaited<ReturnType<typeof fetchDashboardByToken>>;
}
