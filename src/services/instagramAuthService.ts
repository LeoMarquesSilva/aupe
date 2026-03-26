import axios from 'axios';

/** Resposta do OAuth Instagram (Business Login) + campos legados opcionais (Facebook Page). */
export interface InstagramAuthData {
  instagramAccountId: string;
  accessToken: string;
  username: string;
  profilePicture: string;
  tokenExpiry: Date;
  /** Legado (Facebook Page); null com Instagram Login. */
  pageId?: string | null;
  pageName?: string | null;
  /** ISO — usado para refresh (regra 24h Meta). */
  issuedAt?: string;
}

export interface AvailableInstagramAccount {
  instagramAccountId: string;
  username: string;
  profilePicture: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  followersCount?: number;
  mediaCount?: number;
  issuedAt?: string;
  tokenExpiry?: Date;
  savedToDb?: boolean;
}

const DEFAULT_INSTAGRAM_APP_ID = '1087259016929287';

const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
].join(',');

export function getInstagramAppId(): string {
  return process.env.REACT_APP_INSTAGRAM_APP_ID || DEFAULT_INSTAGRAM_APP_ID;
}

/** Deve coincidir com OAuth redirect URIs no Meta App Dashboard (Instagram > Business login). */
export function getInstagramRedirectUri(): string {
  if (process.env.REACT_APP_INSTAGRAM_REDIRECT_URI) {
    return process.env.REACT_APP_INSTAGRAM_REDIRECT_URI;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/callback`;
  }
  return '';
}

/**
 * URL de autorização — Business Login for Instagram (www.instagram.com).
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const getAuthorizationUrl = (clientId?: string): string => {
  const appId = getInstagramAppId();
  const redirectUri = getInstagramRedirectUri();
  let url =
    `https://www.instagram.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(INSTAGRAM_SCOPES)}`;

  if (clientId) {
    url += `&state=${encodeURIComponent(clientId)}`;
  }
  
  return url;
};

export function validateState(_returnedState: string): boolean {
  return true;
}

function normalizeAuthPayload(data: Record<string, unknown>): InstagramAuthData {
  const tokenExpiryRaw = data.tokenExpiry as string;
  return {
    instagramAccountId: String(data.instagramAccountId || ''),
    accessToken: String(data.accessToken || ''),
    username: String(data.username || ''),
    profilePicture: String(data.profilePicture || ''),
    tokenExpiry: tokenExpiryRaw ? new Date(tokenExpiryRaw) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    pageId: (data.pageId as string) ?? null,
    pageName: (data.pageName as string) ?? null,
    issuedAt: typeof data.issuedAt === 'string' ? data.issuedAt : undefined,
  };
}

/**
 * Troca o authorization code por token long-lived via Edge Function (secret só no servidor).
 * Se clientId fornecido, a Edge Function salva diretamente no banco (service role, bypass RLS).
 */
export async function exchangeInstagramAuthCode(
  code: string,
  redirectUriOverride?: string,
  clientId?: string,
): Promise<InstagramAuthData & { savedToDb?: boolean }> {
  const { supabase } = await import('./supabaseClient');
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Faça login na plataforma para conectar o Instagram.');
  }

  const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.REACT_APP_SUPABASE_KEY || '';
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase não configurado (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY).');
  }

  const cleanCode = code.trim().replace(/#_$/, '').replace(/#$/, '');
  const redirectUri = redirectUriOverride || getInstagramRedirectUri();
  if (!redirectUri) {
    throw new Error('redirect_uri ausente: defina REACT_APP_INSTAGRAM_REDIRECT_URI ou use /callback na mesma origem.');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/instagram-oauth-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ code: cleanCode, redirectUri, ...(clientId ? { clientId } : {}) }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string }).message || 'Falha ao conectar Instagram';
    throw new Error(msg);
  }

  const parsed = data as Record<string, unknown>;
  return { ...normalizeAuthPayload(parsed), savedToDb: parsed.savedToDb === true };
}

/** Lista contas — fluxo atual = uma conta via Business Login (sem Facebook Page).
 *  Se clientId fornecido, a Edge Function já salva no banco (server-side).
 */
export const getAvailableInstagramAccounts = async (
  code: string,
  clientId?: string,
): Promise<AvailableInstagramAccount[]> => {
  const auth = await exchangeInstagramAuthCode(code, undefined, clientId);
  return [
    {
      instagramAccountId: auth.instagramAccountId,
      username: auth.username,
      profilePicture: auth.profilePicture,
      pageId: auth.pageId || '',
      pageName: auth.pageName || 'Instagram',
      pageAccessToken: auth.accessToken,
      followersCount: undefined,
      mediaCount: undefined,
      issuedAt: auth.issuedAt,
      tokenExpiry: auth.tokenExpiry,
      savedToDb: auth.savedToDb,
    },
  ];
};

export const connectSpecificInstagramAccount = async (account: AvailableInstagramAccount): Promise<InstagramAuthData> => {
  const tokenExpiry =
    account.tokenExpiry instanceof Date
      ? account.tokenExpiry
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  return {
      instagramAccountId: account.instagramAccountId,
      accessToken: account.pageAccessToken,
      username: account.username,
      profilePicture: account.profilePicture,
      tokenExpiry,
    pageId: account.pageId || null,
    pageName: account.pageName || null,
    issuedAt: account.issuedAt,
  };
};

export const completeInstagramAuth = async (code: string): Promise<InstagramAuthData> => {
  return exchangeInstagramAuthCode(code);
};

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export const getFacebookPages = async (_accessToken: string): Promise<unknown[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/instagram/pages`, {
      params: { accessToken: _accessToken },
    });
    return response.data.pages || [];
  } catch (error: unknown) {
    console.error('Erro ao buscar páginas do Facebook:', error);
    return [];
  }
};

export const getInstagramAccountData = async (
  instagramAccountId: string,
  accessToken: string,
): Promise<{
  id: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
}> => {
    const response = await axios.get(`${API_BASE_URL}/instagram/account`, {
    params: { instagramAccountId, accessToken },
    });
    return response.data;
};

export const verifyToken = async (accessToken: string): Promise<boolean> => {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (r.ok) return true;
    const r2 = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id&access_token=${encodeURIComponent(accessToken)}`,
    );
    return r2.ok;
  } catch {
    return false;
  }
};
