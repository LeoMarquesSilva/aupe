/**
 * Instagram Business Login — server-side code -> long-lived token exchange.
 *
 * Flow:
 *   1. POST https://api.instagram.com/oauth/access_token   -> short-lived token (1h)
 *   2. GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token
 *      -> long-lived token (~60 days)
 *
 * Docs:
 *   https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 *   https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
const axios = require('axios');
const { rateLimit, clientIpFromReq } = require('./rate-limit-ip');

const DEBUG_TAG = 'ig-business-oauth-2026-04-17c';

/**
 * While we are debugging the Meta App Review flow, keep verbose logging and
 * debug responses enabled in production. Flip back to `false` after approval.
 */
const IG_BUSINESS_DEBUG = true;

function maskId(id) {
  if (!id) return '(empty)';
  const s = String(id);
  if (s.length <= 4) return `***${s}`;
  return `***${s.slice(-4)} (len=${s.length})`;
}

function log(step, payload) {
  if (!IG_BUSINESS_DEBUG && process.env.NODE_ENV === 'production') return;
  if (payload === undefined) {
    console.info(`[IG_BUSINESS_OAUTH] ${DEBUG_TAG} ${step}`);
    return;
  }
  console.info(`[IG_BUSINESS_OAUTH] ${DEBUG_TAG} ${step}`, payload);
}

/**
 * Instagram Business Login requires the "Instagram app ID" and "Instagram app secret"
 * from Products > Instagram > API setup with Instagram business login — these are
 * typically DIFFERENT from the Facebook App ID / Secret in Settings > Basic.
 */
function resolveCredentials() {
  const appId = (
    process.env.INSTAGRAM_BUSINESS_APP_ID ||
    process.env.REACT_APP_INSTAGRAM_BUSINESS_APP_ID ||
    process.env.META_APP_ID ||
    process.env.REACT_APP_META_APP_ID ||
    process.env.FACEBOOK_APP_ID ||
    process.env.REACT_APP_FACEBOOK_APP_ID ||
    process.env.REACT_APP_INSTAGRAM_APP_ID ||
    process.env.INSTAGRAM_APP_ID ||
    ''
  ).trim();
  const appSecret = (
    process.env.INSTAGRAM_BUSINESS_APP_SECRET ||
    process.env.REACT_APP_INSTAGRAM_BUSINESS_APP_SECRET ||
    process.env.META_APP_SECRET ||
    process.env.FACEBOOK_APP_SECRET ||
    process.env.REACT_APP_FACEBOOK_APP_SECRET ||
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
async function handleInstagramBusinessOAuthToken(req, res) {
  log('request:start', { method: req.method });

  if (req.method === 'POST') {
    const ip = clientIpFromReq(req);
    const lim = rateLimit(`ig-business-oauth:${ip}`, 30, 60_000);
    if (!lim.ok) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(lim.retryAfterSec));
      }
      return res.status(429).json({ message: 'Too many attempts. Try again shortly.' });
    }
  }

  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { appId, appSecret } = resolveCredentials();
  log('credentials-check', {
    hasAppId: Boolean(appId),
    hasAppSecret: Boolean(appSecret),
    appIdMasked: maskId(appId),
    appSecretMasked: maskId(appSecret),
  });
  if (!appId || !appSecret) {
    return res.status(500).json({
      message:
        'Server is missing Meta credentials. Set INSTAGRAM_BUSINESS_APP_SECRET (and META_APP_ID) in Vercel env.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const code = String(body.code || '').trim();
  const redirectUri = String(body.redirect_uri || '').trim();
  const clientIdAtAuthorize = String(body.client_id_used_at_authorize || '').trim();
  log('payload-check', {
    hasCode: Boolean(code),
    codeLength: code.length,
    codeFirst8: code.slice(0, 8),
    codeLast8: code.slice(-8),
    redirectUri,
    clientIdAtAuthorizeMasked: maskId(clientIdAtAuthorize),
    clientIdConfiguredMasked: maskId(appId),
    clientIdsMatch: clientIdAtAuthorize && clientIdAtAuthorize === appId,
  });
  if (!code) return res.status(400).json({ message: 'code is required' });
  if (!redirectUri) return res.status(400).json({ message: 'redirect_uri is required' });

  if (clientIdAtAuthorize && clientIdAtAuthorize !== appId) {
    // Fail fast with a clear message — otherwise Instagram returns the
    // misleading "redirect_uri doesn't match" error for this case.
    return res.status(400).json({
      message:
        'client_id mismatch: the Instagram App ID used at authorize is different ' +
        'from the one configured on the server (INSTAGRAM_BUSINESS_APP_ID). Update ' +
        'REACT_APP_INSTAGRAM_BUSINESS_APP_ID and INSTAGRAM_BUSINESS_APP_ID to the ' +
        'SAME value — the "Instagram app ID" from Products > Instagram > API setup ' +
        'with Instagram business login.',
      debug: IG_BUSINESS_DEBUG
        ? {
            clientIdAtAuthorizeMasked: maskId(clientIdAtAuthorize),
            clientIdConfiguredMasked: maskId(appId),
          }
        : undefined,
    });
  }

  // Instagram appends `#_` to the authorization code for legacy browser flows.
  const cleanCode = code.replace(/#_$/, '').replace(/#$/, '');
  log('clean-code', {
    originalLength: code.length,
    cleanLength: cleanCode.length,
    trimmedChars: code.length - cleanCode.length,
  });

  console.info(
    `[IG_BUSINESS_OAUTH] sending to Instagram:`,
    JSON.stringify({
      client_id: maskId(appId),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_prefix: cleanCode.slice(0, 8),
    }),
  );

  try {
    // Step 1: short-lived token via api.instagram.com
    // The Meta docs example uses `curl -F` (multipart/form-data). We replicate
    // that format exactly because Instagram has been known to be picky about
    // the content type on this endpoint in some edge cases.
    const boundary = `----ig-business-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const lines = [];
    const addField = (name, value) => {
      lines.push(`--${boundary}`);
      lines.push(`Content-Disposition: form-data; name="${name}"`);
      lines.push('');
      lines.push(String(value));
    };
    addField('client_id', appId);
    addField('client_secret', appSecret);
    addField('grant_type', 'authorization_code');
    addField('redirect_uri', redirectUri);
    addField('code', cleanCode);
    lines.push(`--${boundary}--`);
    lines.push('');
    const multipartBody = lines.join('\r\n');

    const shortRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      multipartBody,
      {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(multipartBody),
        },
      },
    );

    const shortToken = shortRes.data && shortRes.data.access_token;
    const userId = shortRes.data && shortRes.data.user_id;
    log('short-token-ok', { hasToken: Boolean(shortToken), userId });
    if (!shortToken) {
      return res.status(502).json({ message: 'Empty short-lived token from Instagram' });
    }

    // Step 2: exchange for long-lived token (~60 days) via graph.instagram.com
    const longRes = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: appSecret,
        access_token: shortToken,
      },
    });

    const longToken = longRes.data && longRes.data.access_token;
    const expiresIn = Number(longRes.data && longRes.data.expires_in) || 60 * 24 * 60 * 60;
    log('long-token-ok', { expiresIn });
    if (!longToken) {
      return res.status(502).json({ message: 'Empty long-lived token from Instagram' });
    }

    return res.status(200).json({
      access_token: longToken,
      user_id: userId,
      expires_in: expiresIn,
      token_type: 'bearer',
    });
  } catch (e) {
    const graphError = e && e.response && e.response.data;
    log('error', {
      message: (e && e.message) || 'unknown',
      status: e && e.response && e.response.status,
      graphErrorKeys: graphError ? Object.keys(graphError) : null,
    });
    // Full dump of the Instagram response body so we can see the actual
    // error_type / code / fbtrace_id / error_subcode. Without this we're
    // guessing at Instagram's complaint.
    try {
      console.info(
        `[IG_BUSINESS_OAUTH] full Instagram error response:`,
        JSON.stringify(graphError, null, 2),
      );
    } catch {
      console.info(`[IG_BUSINESS_OAUTH] full Instagram error response (non-serializable):`, graphError);
    }
    const rawMessage =
      (graphError && (graphError.error_message || graphError.error_description)) ||
      (graphError && graphError.error && graphError.error.message) ||
      (e && e.message) ||
      'Token exchange failed';
    // Surface the redirect_uri we sent so the developer can compare it
    // character-for-character with what is registered in the Meta dashboard.
    const message = /redirect_uri/i.test(rawMessage)
      ? `${rawMessage} (we sent: "${redirectUri}")`
      : rawMessage;
    const statusFromUpstream =
      e && e.response && typeof e.response.status === 'number' ? e.response.status : 502;
    const clientStatus = statusFromUpstream >= 400 && statusFromUpstream < 500 ? 400 : 502;
    return res.status(clientStatus).json({
      message,
      debug: (IG_BUSINESS_DEBUG || process.env.NODE_ENV !== 'production')
        ? {
            redirectUriSent: redirectUri,
            appIdMasked: maskId(appId),
            appSecretMasked: maskId(appSecret),
            graphError,
          }
        : undefined,
    });
  }
}

module.exports = { handleInstagramBusinessOAuthToken, resolveCredentials };
