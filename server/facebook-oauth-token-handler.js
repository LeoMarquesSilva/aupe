/**
 * Troca code → token long-lived (Facebook Login / Graph), só no servidor.
 * Usado pela Vercel Function e pelo setupProxy em dev.
 */
const axios = require('axios');
const { rateLimit, clientIpFromReq } = require('./rate-limit-ip');
const OAUTH_DEBUG_TAG = 'oauth-api-debug-2026-03-29a';

function sanitizeGraphErrorForLog(data) {
  if (!data || typeof data !== 'object') return data;
  try {
    const s = JSON.stringify(data);
    if (/access_token|client_secret|fb_exchange_token/i.test(s)) {
      return '[Graph error redacted: possível token no payload]';
    }
    return data;
  } catch {
    return '[unserializable]';
  }
}

function logOAuthApi(step, payload) {
  if (process.env.NODE_ENV === 'production') return;
  if (payload === undefined) {
    console.info(`[FB_OAUTH_API_DEBUG] ${OAUTH_DEBUG_TAG} ${step}`);
    return;
  }
  const safe =
    step === 'request:error' && payload && typeof payload === 'object'
      ? { ...payload, graphError: sanitizeGraphErrorForLog(payload.graphError) }
      : payload;
  console.info(`[FB_OAUTH_API_DEBUG] ${OAUTH_DEBUG_TAG} ${step}`, safe);
}

/** Facebook Login apenas; nomes INSTAGRAM_* / REACT_APP_INSTAGRAM_* são alias legado. */
function resolveCredentials() {
  const appId = (
    process.env.FACEBOOK_APP_ID ||
    process.env.REACT_APP_FACEBOOK_APP_ID ||
    process.env.INSTAGRAM_APP_ID ||
    process.env.REACT_APP_INSTAGRAM_APP_ID ||
    ''
  ).trim();
  const appSecret = (
    process.env.FACEBOOK_APP_SECRET ||
    process.env.REACT_APP_FACEBOOK_APP_SECRET ||
    process.env.REACT_APP_META_APP_SECRET ||
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.REACT_APP_INSTAGRAM_APP_SECRET ||
    ''
  ).trim();
  return { appId, appSecret };
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse & { status?: (n: number) => any; json?: (o: unknown) => void; setHeader?: (a: string, b: string) => void }} res
 */
async function handleFacebookOAuthToken(req, res) {
  logOAuthApi('request:start', { method: req.method });
  if (req.method === 'POST') {
    const ip = clientIpFromReq(req);
    const lim = rateLimit(`fb-oauth-token:${ip}`, 30, 60_000);
    if (!lim.ok) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(lim.retryAfterSec));
      }
      return res.status(429).json({ message: 'Muitas tentativas. Aguarde e tente novamente.' });
    }
  }
  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { appId, appSecret } = resolveCredentials();
  logOAuthApi('request:credentials-check', {
    hasAppId: Boolean(appId),
    hasAppSecret: Boolean(appSecret),
  });
  if (!appId || !appSecret) {
    return res.status(500).json({
      message:
        'Servidor sem credenciais Facebook: defina FACEBOOK_APP_ID + FACEBOOK_APP_SECRET (ou REACT_APP_FACEBOOK_* no build) na Vercel / .env.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ message: 'JSON inválido' });
    }
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }

  const code = body.code;
  const redirect_uri = String(body.redirect_uri || '').trim();
  logOAuthApi('request:payload-check', {
    hasCode: Boolean(code && String(code).trim()),
    codeLength: String(code || '').trim().length,
    redirectUri: redirect_uri,
  });
  if (!code || !String(code).trim()) {
    return res.status(400).json({ message: 'code obrigatório' });
  }
  if (!redirect_uri) {
    return res.status(400).json({ message: 'redirect_uri obrigatório' });
  }
  const cleanCode = String(code)
    .trim()
    .replace(/#_$/, '')
    .replace(/#$/, '');

  try {
    const t1 = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri,
        code: cleanCode,
      },
    });
    const shortLived = t1.data.access_token;
    const t2 = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLived,
      },
    });
    return res.status(200).json({
      access_token: t2.data.access_token,
      expires_in: Number(t2.data.expires_in) || 60 * 24 * 60 * 60,
    });
  } catch (e) {
    logOAuthApi('request:error', {
      message: (e && e.message) || 'unknown',
      graphError: e && e.response && e.response.data ? e.response.data : null,
    });
    const ax = e.response && e.response.data;
    if (ax && ax.error) {
      return res.status(400).json({
        message: ax.error.message || 'Erro Graph',
        code: ax.error.code,
      });
    }
    return res.status(502).json({ message: (e && e.message) || 'Falha na troca de token' });
  }
}

module.exports = { handleFacebookOAuthToken, resolveCredentials };
