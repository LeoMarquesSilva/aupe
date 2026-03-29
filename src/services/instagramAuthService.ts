import axios from 'axios';

const IG_AUTH_DEBUG_TAG = 'ig-auth-debug-2026-03-29a';
const IG_AUTH_DEBUG_PREFIX = '[IG_AUTH_DEBUG]';

function logAuthDebug(step: string, payload?: unknown): void {
  if (payload === undefined) {
    console.info(`${IG_AUTH_DEBUG_PREFIX} ${IG_AUTH_DEBUG_TAG} ${step}`);
    return;
  }
  console.info(`${IG_AUTH_DEBUG_PREFIX} ${IG_AUTH_DEBUG_TAG} ${step}`, payload);
}

// Em React StrictMode (dev), efeitos podem disparar duas vezes; evita consumir o mesmo code duas vezes.
const accountsByCodeInFlight = new Map<string, Promise<AvailableInstagramAccount[]>>();
const accountsByCodeCache = new Map<string, AvailableInstagramAccount[]>();

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
  /** Nome de exibição do perfil (campo Graph `name` no nó Instagram Business). */
  profileName?: string;
  /** Após `saveInstagramAuth`: `clients.name` persistido (sincronizar UI do pai). */
  clientName?: string;
}

export interface AvailableInstagramAccount {
  instagramAccountId: string;
  username: string;
  profilePicture: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  /** Nome do perfil IG (Graph). */
  profileName?: string;
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
  name?: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
}

interface FacebookPagesResponse {
  data: FacebookPage[];
}

export interface InstagramOAuthDebugSnapshot {
  debugTag: string;
  origin: string;
  nodeEnv: string;
  hasFacebookAppId: boolean;
  hasInstagramAppIdAlias: boolean;
  hasFacebookRedirectUri: boolean;
  hasInstagramRedirectUriAlias: boolean;
  hasClientSecretFallback: boolean;
}

export function getInstagramOAuthDebugSnapshot(): InstagramOAuthDebugSnapshot {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    debugTag: IG_AUTH_DEBUG_TAG,
    origin,
    nodeEnv: process.env.NODE_ENV || 'unknown',
    hasFacebookAppId: Boolean((process.env.REACT_APP_FACEBOOK_APP_ID || '').trim()),
    hasInstagramAppIdAlias: Boolean((process.env.REACT_APP_INSTAGRAM_APP_ID || '').trim()),
    hasFacebookRedirectUri: Boolean((process.env.REACT_APP_FACEBOOK_REDIRECT_URI || '').trim()),
    hasInstagramRedirectUriAlias: Boolean((process.env.REACT_APP_INSTAGRAM_REDIRECT_URI || '').trim()),
    hasClientSecretFallback: Boolean(tryClientSideAppSecret()),
  };
}

if (typeof window !== 'undefined') {
  const w = window as unknown as { __IG_AUTH_DEBUG_TAG__?: string };
  w.__IG_AUTH_DEBUG_TAG__ = IG_AUTH_DEBUG_TAG;
  logAuthDebug('bundle-loaded', getInstagramOAuthDebugSnapshot());
}

/** App ID — Facebook Login (Graph); REACT_APP_INSTAGRAM_APP_ID é só alias legado. */
export function getMetaAppId(): string {
  const id = (process.env.REACT_APP_FACEBOOK_APP_ID || process.env.REACT_APP_INSTAGRAM_APP_ID || '').trim();
  if (!id) {
    throw new Error(
      'Configure REACT_APP_FACEBOOK_APP_ID com o ID do aplicativo Meta (Facebook Login). Alias legado: REACT_APP_INSTAGRAM_APP_ID.',
    );
  }
  return id;
}

function cleanOAuthCode(code: string): string {
  return code.trim().replace(/#_$/, '').replace(/#$/, '');
}

/** Secret no bundle só para fallback (evitar); troca real = POST /api/facebook-oauth-token + FACEBOOK_APP_SECRET. */
function tryClientSideAppSecret(): string {
  return (
    process.env.REACT_APP_FACEBOOK_APP_SECRET ||
    process.env.REACT_APP_META_APP_SECRET ||
    process.env.REACT_APP_INSTAGRAM_APP_SECRET ||
    ''
  ).trim();
}

/**
 * Troca code → token long-lived (Facebook OAuth): POST /api/facebook-oauth-token (secret no servidor);
 * se rota ausente/HTML, fallback legado com secret no bundle (não recomendado).
 */
async function exchangeLongLivedUserAccessToken(
  cleanCode: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresInSec: number }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  logAuthDebug('exchange:start', {
    origin,
    redirectUri,
    codeLength: cleanCode.length,
    snapshot: getInstagramOAuthDebugSnapshot(),
  });

  if (origin) {
    try {
      logAuthDebug('exchange:fetch:/api/facebook-oauth-token:request');
      const r = await fetch(`${origin}/api/facebook-oauth-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, redirect_uri: redirectUri }),
      });
      const raw = await r.text();
      logAuthDebug('exchange:fetch:/api/facebook-oauth-token:response', {
        status: r.status,
        ok: r.ok,
        contentType: r.headers.get('content-type') || '',
        bodyPreview: raw.slice(0, 300),
      });
      // `serve -s build` e SPAs costumam devolver index.html com 200 para /api/* — não é JSON.
      const looksLikeHtml =
        /^\s*</.test(raw) && (raw.includes('<!DOCTYPE') || raw.includes('<html'));

      let apiJson: { access_token?: string; expires_in?: number; message?: string } | null = null;
      if (!looksLikeHtml) {
        try {
          apiJson = JSON.parse(raw) as { access_token?: string; expires_in?: number; message?: string };
        } catch {
          /* não é JSON — pode ser proxy/HTML estranho */
        }
      }

      if (r.ok && apiJson?.access_token) {
        logAuthDebug('exchange:server-success', { expiresInSec: Number(apiJson.expires_in) || 60 * 24 * 60 * 60 });
        return {
          accessToken: apiJson.access_token,
          expiresInSec: Number(apiJson.expires_in) || 60 * 24 * 60 * 60,
        };
      }

      const routeMissing = r.status === 404 || r.status === 405;

      // Erro explícito da API (ex.: servidor sem FACEBOOK_APP_SECRET) — não mascarar como "falta REACT_APP no browser"
      if (apiJson?.message && !routeMissing) {
        logAuthDebug('exchange:server-error-message', { message: apiJson.message, status: r.status });
        throw new Error(apiJson.message);
      }

      // 4xx da nossa API (código OAuth inválido, etc.)
      const clientErr = r.status >= 400 && r.status < 500 && !routeMissing;
      if (clientErr) {
        logAuthDebug('exchange:server-client-error', { status: r.status });
        throw new Error(apiJson?.message || raw.slice(0, 800) || `Erro na troca de token (${r.status})`);
      }

      // 5xx ou 502 Graph: não cair no fallback do App Secret no cliente
      if (r.status >= 500) {
        logAuthDebug('exchange:server-5xx', { status: r.status });
        throw new Error(
          apiJson?.message ||
            'Falha no servidor ao trocar o código (Facebook). Defina FACEBOOK_APP_ID + FACEBOOK_APP_SECRET no .env ou nas variáveis Vercel.',
        );
      }

      // 404/405, HTML, ou resposta sem rota → tenta secret no bundle (legado / hosting sem API)
      logAuthDebug('exchange:fallback-client-secret:route-missing-or-html', {
        status: r.status,
        routeMissing,
        looksLikeHtml,
      });
    } catch (e) {
      const network =
        e instanceof TypeError ||
        (e instanceof Error &&
          (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')));
      logAuthDebug('exchange:catch', {
        network,
        error: e instanceof Error ? e.message : String(e),
      });
      if (!network && e instanceof Error) throw e;
    }
  }

  const appId = getMetaAppId();
  const appSecret = tryClientSideAppSecret();
  if (!appSecret) {
    const prod = process.env.NODE_ENV === 'production';
    logAuthDebug('exchange:fallback-client-secret:missing', {
      appIdPresent: Boolean(appId),
      snapshot: getInstagramOAuthDebugSnapshot(),
    });
    throw new Error(
      (prod
        ? 'Produção: a rota /api/facebook-oauth-token não devolveu token e o App Secret não está no bundle. '
        : '') +
        'Configure FACEBOOK_APP_SECRET (e FACEBOOK_APP_ID se usar só no servidor) no .env para a API trocar o código — ' +
        'ou npm run serve:build / Vercel com api/. ' +
        'Testes apenas: REACT_APP_FACEBOOK_APP_SECRET no bundle (não recomendado em produção). ' +
        'Em dev: reinicie npm run dev após alterar .env.',
    );
  }

  const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code: cleanCode,
    },
  });

  const shortLivedToken = tokenResponse.data.access_token as string;
  logAuthDebug('exchange:client-fallback:short-lived-token-ok');

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
  logAuthDebug('exchange:client-fallback:long-lived-token-ok', { expiresInSec });
  return { accessToken, expiresInSec };
}

/**
 * Redirect OAuth — deve estar em Facebook Login > Configurações > URIs de redirecionamento OAuth válidos.
 */
export function getFacebookRedirectUri(): string {
  const facebook = (process.env.REACT_APP_FACEBOOK_REDIRECT_URI || '').trim();
  const instagramAlias = (process.env.REACT_APP_INSTAGRAM_REDIRECT_URI || '').trim();

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const isLocalOrigin = /^(http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/i.test(origin);
    const currentCallback = `${origin}/callback`;

    // Em dev local, evita cair para domínio remoto antigo via alias REACT_APP_INSTAGRAM_REDIRECT_URI.
    if (isLocalOrigin) {
      if (facebook) {
        try {
          const parsed = new URL(facebook);
          const isLocalConfigured =
            parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
          if (!isLocalConfigured) {
            logAuthDebug('redirect-uri:force-local-callback', {
              reason: 'facebook_redirect_uri_points_to_remote_host',
              configured: facebook,
              forced: currentCallback,
            });
            return currentCallback;
          }
          return facebook;
        } catch {
          return currentCallback;
        }
      }

      if (instagramAlias) {
        try {
          const parsed = new URL(instagramAlias);
          const isLocalConfigured =
            parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
          if (!isLocalConfigured) {
            logAuthDebug('redirect-uri:force-local-callback', {
              reason: 'instagram_alias_redirect_uri_points_to_remote_host',
              configured: instagramAlias,
              forced: currentCallback,
            });
            return currentCallback;
          }
          return instagramAlias;
        } catch {
          return currentCallback;
        }
      }
      return currentCallback;
    }
  }

  if (facebook) return facebook;
  if (instagramAlias) return instagramAlias;
  if (typeof window !== 'undefined') return `${window.location.origin}/callback`;
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
    throw new Error(
      'redirect_uri ausente: defina REACT_APP_FACEBOOK_REDIRECT_URI (Facebook Login) ou alias legado REACT_APP_INSTAGRAM_REDIRECT_URI.',
    );
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
  const cleanCode = cleanOAuthCode(code);
  const cached = accountsByCodeCache.get(cleanCode);
  if (cached) {
    logAuthDebug('accounts:cache-hit', { codeLength: cleanCode.length, size: cached.length });
    return cached;
  }
  const pending = accountsByCodeInFlight.get(cleanCode);
  if (pending) {
    logAuthDebug('accounts:reuse-inflight', { codeLength: cleanCode.length });
    return pending;
  }

  const requestPromise = (async (): Promise<AvailableInstagramAccount[]> => {
  logAuthDebug('accounts:start', {
    codeLength: code?.length || 0,
    clientId: _clientId || null,
    snapshot: getInstagramOAuthDebugSnapshot(),
  });
  getMetaAppId();
  const redirectUri = getFacebookRedirectUri();

  try {
    const { accessToken, expiresInSec } = await exchangeLongLivedUserAccessToken(cleanCode, redirectUri);
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
              fields: 'username,name,profile_picture_url,followers_count,media_count',
            },
          },
        );

        const instagramData = instagramResponse.data;
        const profileName = (instagramData.name || '').trim() || undefined;

        availableAccounts.push({
          instagramAccountId,
          username: instagramData.username,
          profilePicture: instagramData.profile_picture_url,
          profileName,
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

    accountsByCodeCache.set(cleanCode, availableAccounts);
    return availableAccounts;
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { error?: { message?: string; code?: number } } } };
    if (ax.response?.data?.error) {
      const fbError = ax.response.data.error;
      throw new Error(`Erro do Facebook: ${fbError.message} (código ${fbError.code})`);
    }
    throw error;
  }
  })();

  accountsByCodeInFlight.set(cleanCode, requestPromise);
  try {
    return await requestPromise;
  } finally {
    accountsByCodeInFlight.delete(cleanCode);
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
    profileName: account.profileName,
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
