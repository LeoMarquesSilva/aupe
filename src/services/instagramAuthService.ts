import axios from 'axios';

/** Dados após conectar conta IG via Página do Facebook (Graph API). */
export interface InstagramAuthData {
  instagramAccountId: string;
  accessToken: string;
  username: string;
  profilePicture: string;
  tokenExpiry: Date;
  pageId?: string | null;
  pageName?: string | null;
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
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface InstagramAccountData {
  id: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
}

interface FacebookPagesResponse {
  data: FacebookPage[];
}

const DEFAULT_APP_ID = '1087259016929287';

/** App ID do produto Facebook Login (mesmo app no Meta for Developers). */
export function getMetaAppId(): string {
  return process.env.REACT_APP_FACEBOOK_APP_ID || process.env.REACT_APP_INSTAGRAM_APP_ID || DEFAULT_APP_ID;
}

/**
 * App Secret — necessário para trocar `code` por token no navegador (fluxo legado).
 * Configure em Vercel/local; não commite o valor real.
 */
function getMetaAppSecret(): string {
  const s = process.env.REACT_APP_FACEBOOK_APP_SECRET || process.env.REACT_APP_META_APP_SECRET || '';
  if (!s) {
    throw new Error(
      'Configure REACT_APP_FACEBOOK_APP_SECRET (App Secret do Meta) para o login via Facebook/Graph.',
    );
  }
  return s;
}

/**
 * Redirect OAuth — deve estar em Facebook Login > Configurações > URIs de redirecionamento OAuth válidos.
 */
export function getFacebookRedirectUri(): string {
  if (process.env.REACT_APP_FACEBOOK_REDIRECT_URI) {
    return process.env.REACT_APP_FACEBOOK_REDIRECT_URI.trim();
  }
  if (process.env.REACT_APP_INSTAGRAM_REDIRECT_URI) {
    return process.env.REACT_APP_INSTAGRAM_REDIRECT_URI.trim();
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/callback`;
  }
  return '';
}

/** Alias — mesmo App ID. */
export const getInstagramAppId = getMetaAppId;

/** Alias — aceita REACT_APP_INSTAGRAM_REDIRECT_URI legado. */
export const getInstagramRedirectUri = getFacebookRedirectUri;

/** Escopos Graph (Facebook Login) — páginas + Instagram Business vinculado. */
const FACEBOOK_LOGIN_SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_content_publish',
  'pages_read_engagement',
  'pages_show_list',
  'business_management',
].join(',');

/**
 * URL de autorização — Facebook Login (dialog/oauth), não Instagram Business Login.
 */
export const getAuthorizationUrl = (clientId?: string): string => {
  const appId = getMetaAppId();
  const redirectUri = getFacebookRedirectUri();
  if (!redirectUri) {
    throw new Error('redirect_uri ausente: defina REACT_APP_FACEBOOK_REDIRECT_URI ou use /callback na mesma origem.');
  }
  let url =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(FACEBOOK_LOGIN_SCOPES)}` +
    `&response_type=code`;

  if (clientId) {
    url += `&state=${encodeURIComponent(clientId)}`;
  }
  return url;
};

export function validateState(_returnedState: string): boolean {
  return true;
}

export const getAvailableInstagramAccounts = async (
  code: string,
  _clientId?: string,
): Promise<AvailableInstagramAccount[]> => {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const redirectUri = getFacebookRedirectUri();
  const cleanCode = code.trim().replace(/#_$/, '').replace(/#$/, '');

  try {
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: cleanCode,
      },
    });

    const shortLivedToken = tokenResponse.data.access_token as string;

    const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const accessToken = longLivedTokenResponse.data.access_token as string;
    const expiresInSec = Number(longLivedTokenResponse.data.expires_in) || 60 * 24 * 60 * 60;
    const tokenExpiry = new Date(Date.now() + expiresInSec * 1000);

    const pagesResponse = await axios.get<FacebookPagesResponse>('https://graph.facebook.com/v21.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'instagram_business_account,name,id,access_token',
      },
    });

    const pages: FacebookPage[] = pagesResponse.data.data || [];

    if (pages.length === 0) {
      throw new Error(
        'Nenhuma página do Facebook encontrada. Crie uma Página e vincule-a à sua conta.',
      );
    }

    const pagesWithInstagram = pages.filter((p) => p.instagram_business_account?.id);

    if (pagesWithInstagram.length === 0) {
      throw new Error(
        'Nenhuma conta Instagram Business vinculada às suas páginas. Vincule o Instagram à Página no Meta Business Suite.',
      );
    }

    const availableAccounts: AvailableInstagramAccount[] = [];

    for (const page of pagesWithInstagram) {
      try {
        const instagramAccountId = page.instagram_business_account!.id;
        const instagramResponse = await axios.get<InstagramAccountData>(
          `https://graph.facebook.com/v21.0/${instagramAccountId}`,
          {
            params: {
              access_token: page.access_token,
              fields: 'username,profile_picture_url,followers_count,media_count',
            },
          },
        );

        const instagramData = instagramResponse.data;

        availableAccounts.push({
          instagramAccountId,
          username: instagramData.username,
          profilePicture: instagramData.profile_picture_url,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          followersCount: instagramData.followers_count,
          mediaCount: instagramData.media_count,
          tokenExpiry,
        });
      } catch (err: unknown) {
        const ax = err as { response?: { data?: unknown } };
        console.error(`Erro ao buscar IG da página ${page.name}:`, ax.response?.data || err);
      }
    }

    if (availableAccounts.length === 0) {
      throw new Error(
        'Não foi possível carregar dados das contas Instagram. Verifique permissões e vínculo Página + Instagram.',
      );
    }

    return availableAccounts;
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { error?: { message?: string; code?: number } } } };
    if (ax.response?.data?.error) {
      const fbError = ax.response.data.error;
      throw new Error(`Erro do Facebook: ${fbError.message} (código ${fbError.code})`);
    }
    throw error;
  }
};

export const connectSpecificInstagramAccount = async (
  account: AvailableInstagramAccount,
): Promise<InstagramAuthData> => {
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
    pageId: account.pageId,
    pageName: account.pageName,
    issuedAt: new Date().toISOString(),
  };
};

export const completeInstagramAuth = async (code: string): Promise<InstagramAuthData> => {
  const accounts = await getAvailableInstagramAccounts(code);
  if (accounts.length === 0) {
    throw new Error('Nenhuma conta Instagram disponível.');
  }
  return connectSpecificInstagramAccount(accounts[0]);
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
): Promise<InstagramAccountData> => {
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
