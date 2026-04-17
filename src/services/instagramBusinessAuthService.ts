/**
 * Instagram Business Login — Instagram API with Instagram Login.
 *
 * Distinct from `instagramAuthService.ts` (Facebook Login for Business).
 * Endpoints live under instagram.com / api.instagram.com / graph.instagram.com
 * and scopes are prefixed `instagram_business_*`.
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */

export interface InstagramBusinessTokenResponse {
  access_token: string;
  user_id: string | number;
  expires_in: number;
  token_type?: string;
}

export interface InstagramBusinessProfile {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
  profile_picture_url?: string;
  name?: string;
}

/** Scopes requested in App Review. Update this list if you request more/fewer. */
export const INSTAGRAM_BUSINESS_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
] as const;

/**
 * IMPORTANT: the `client_id` expected by https://www.instagram.com/oauth/authorize
 * is the **Instagram App ID** shown in the Meta dashboard under
 *   Products > Instagram > API setup with Instagram business login > "Instagram app ID"
 *
 * It is usually DIFFERENT from the Facebook App ID in Settings > Basic.
 * Using the Facebook App ID here causes the "Invalid platform app" error.
 *
 * We DO NOT fall back to REACT_APP_META_APP_ID / REACT_APP_FACEBOOK_APP_ID anymore.
 * If REACT_APP_INSTAGRAM_BUSINESS_APP_ID is missing at build time we throw a
 * clear, actionable error instead of silently sending the wrong client_id.
 */
export function getInstagramBusinessAppId(): string {
  const id = (process.env.REACT_APP_INSTAGRAM_BUSINESS_APP_ID || '').trim();
  if (!id) {
    throw new Error(
      'REACT_APP_INSTAGRAM_BUSINESS_APP_ID is not set in this build. ' +
        'Add it to Vercel (Production + Preview) with the "Instagram app ID" ' +
        'from Meta > Products > Instagram > API setup with Instagram business login, ' +
        'then redeploy. Falling back to the Facebook App ID causes ' +
        '"Invalid platform app" on the Instagram authorize page.',
    );
  }
  return id;
}

/**
 * Returns the redirect URI WITH a trailing slash.
 *
 * The Meta App Dashboard documents that it "may have added a trailing slash
 * to your URIs" when it stores them — meaning a URI you typed as
 *   https://example.com/callback/instagram-business
 * may have been canonicalized internally to
 *   https://example.com/callback/instagram-business/
 *
 * If we then send the no-slash version at token exchange, Instagram fails
 * the byte-equality check and returns the famously misleading
 * "Error validating verification code. Please make sure your redirect_uri
 *  is identical to the one you used in the OAuth dialog request."
 *
 * Always sending the trailing-slash version sidesteps this normalization
 * bug. Make sure the trailing-slash variant is also present in the
 * "OAuth redirect URIs" list in Products > Instagram > API setup with
 * Instagram business login > Business login configuration.
 *
 * React Router v6 treats `/x` and `/x/` as the same route, so this does
 * not break our callback page routing.
 */
export function getInstagramBusinessRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/callback/instagram-business/`;
}

/**
 * Build the authorization URL for Instagram Business Login.
 *
 * Reviewers will see exactly the scopes listed here on the consent screen —
 * make sure they match what you requested in App Review.
 */
export function getInstagramBusinessAuthUrl(state?: string): string {
  const appId = getInstagramBusinessAppId();
  const redirectUri = getInstagramBusinessRedirectUri();
  if (!redirectUri) {
    throw new Error('window.location.origin is required to build redirect URI.');
  }
  const scope = INSTAGRAM_BUSINESS_SCOPES.join(',');
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
  });
  if (state) params.set('state', state);

  // Persist the EXACT redirect_uri used for the authorize request so we can
  // send the same one back during code-for-token exchange. Anything computed
  // dynamically later (e.g. via window.location.origin on the callback page)
  // could theoretically differ if the user lands on a different host or port.
  try {
    window.sessionStorage.setItem('ig_business_oauth_redirect_uri', redirectUri);
    window.sessionStorage.setItem('ig_business_oauth_client_id', appId);
  } catch {
    /* sessionStorage can be unavailable in some privacy modes */
  }

  // eslint-disable-next-line no-console
  console.info(
    '[IG_BUSINESS_OAUTH] authorize step — redirect_uri:',
    JSON.stringify(redirectUri),
    'client_id:',
    `***${appId.slice(-4)}`,
  );

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange the authorization `code` for a long-lived token via our serverless
 * endpoint (App Secret never leaves the server).
 */
export async function exchangeInstagramBusinessCode(
  code: string,
): Promise<InstagramBusinessTokenResponse> {
  // Prefer the redirect_uri captured during the authorize step. This avoids
  // any host/port drift between the two halves of the OAuth dance.
  const storedRedirectUri =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('ig_business_oauth_redirect_uri')
      : null;
  const redirectUri = storedRedirectUri || getInstagramBusinessRedirectUri();

  // Also forward the client_id we used at authorize so the server can assert
  // it matches the INSTAGRAM_BUSINESS_APP_ID configured in its environment.
  // A mismatch here produces the same "Error validating verification code"
  // message Instagram shows for redirect_uri drift.
  const clientIdUsedAtAuthorize =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('ig_business_oauth_client_id') || undefined
      : undefined;

  // eslint-disable-next-line no-console
  console.info(
    '[IG_BUSINESS_OAUTH] token exchange — redirect_uri:',
    JSON.stringify(redirectUri),
    storedRedirectUri ? '(from sessionStorage)' : '(freshly computed)',
    'client_id:',
    clientIdUsedAtAuthorize ? `***${clientIdUsedAtAuthorize.slice(-4)}` : '(missing)',
  );

  const response = await fetch('/api/instagram-business-oauth-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      client_id_used_at_authorize: clientIdUsedAtAuthorize,
    }),
  });

  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Invalid token response (status ${response.status})`);
  }

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error('[IG_BUSINESS_OAUTH] token exchange failed payload:', payload);
    const message =
      (payload.message as string) ||
      (payload.error_message as string) ||
      `Token exchange failed (status ${response.status})`;
    throw new Error(message);
  }

  return payload as unknown as InstagramBusinessTokenResponse;
}

const GRAPH_IG_BASE = 'https://graph.instagram.com/v21.0';

/**
 * Read the connected Instagram professional profile.
 * Demonstrates `instagram_business_basic`.
 */
export async function getInstagramBusinessProfile(
  accessToken: string,
): Promise<InstagramBusinessProfile> {
  const fields = 'id,username,account_type,media_count,profile_picture_url,name';
  const url = `${GRAPH_IG_BASE}/me?fields=${fields}&access_token=${encodeURIComponent(
    accessToken,
  )}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Profile read failed: ${r.status} ${text.slice(0, 300)}`);
  }
  return r.json();
}

export interface InstagramBusinessMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

/**
 * List the authenticated user's recent media.
 * Used by the insights section of the demo page.
 */
export async function getInstagramBusinessMedia(
  accessToken: string,
  limit = 5,
): Promise<InstagramBusinessMedia[]> {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url =
    `${GRAPH_IG_BASE}/me/media?fields=${fields}&limit=${limit}` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Media list failed: ${r.status} ${text.slice(0, 300)}`);
  }
  const json = (await r.json()) as { data?: InstagramBusinessMedia[] };
  return json.data || [];
}

export interface InstagramMediaInsight {
  name: string;
  period?: string;
  values?: Array<{ value: number }>;
  title?: string;
}

/**
 * Read insights for one media. Demonstrates `instagram_business_manage_insights`.
 * Metric availability depends on media type; we request the most common ones.
 */
export async function getInstagramMediaInsights(
  mediaId: string,
  mediaType: string,
  accessToken: string,
): Promise<InstagramMediaInsight[]> {
  const metrics =
    mediaType === 'VIDEO' || mediaType === 'REELS'
      ? 'reach,likes,comments,shares,saved,total_interactions'
      : 'reach,likes,comments,saved,total_interactions';
  const url =
    `${GRAPH_IG_BASE}/${mediaId}/insights?metric=${metrics}` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Insights failed: ${r.status} ${text.slice(0, 300)}`);
  }
  const json = (await r.json()) as { data?: InstagramMediaInsight[] };
  return json.data || [];
}

export interface PublishMediaArgs {
  userId: string;
  imageUrl: string;
  caption?: string;
  accessToken: string;
}

/**
 * Two-step publish flow for `instagram_business_content_publish`:
 *  1. Create a media container with `image_url` + optional `caption`.
 *  2. Publish the container to get the final media id / permalink.
 */
export async function publishInstagramImage(
  args: PublishMediaArgs,
): Promise<{ id: string; permalink?: string }> {
  const { userId, imageUrl, caption, accessToken } = args;

  const createBody = new URLSearchParams({
    image_url: imageUrl,
    access_token: accessToken,
  });
  if (caption) createBody.set('caption', caption);

  const createRes = await fetch(`${GRAPH_IG_BASE}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody.toString(),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Media container creation failed: ${text.slice(0, 400)}`);
  }
  const { id: creationId } = (await createRes.json()) as { id: string };

  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${GRAPH_IG_BASE}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishBody.toString(),
  });
  if (!publishRes.ok) {
    const text = await publishRes.text();
    throw new Error(`Media publish failed: ${text.slice(0, 400)}`);
  }
  const publishJson = (await publishRes.json()) as { id: string };

  const permalinkUrl =
    `${GRAPH_IG_BASE}/${publishJson.id}?fields=permalink` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  try {
    const p = await fetch(permalinkUrl);
    if (p.ok) {
      const pj = (await p.json()) as { permalink?: string };
      return { id: publishJson.id, permalink: pj.permalink };
    }
  } catch {
    /* ignore — permalink is a nice-to-have */
  }
  return { id: publishJson.id };
}

const STORAGE_KEY = 'ig_business_token_v1';

export interface StoredInstagramBusinessToken extends InstagramBusinessTokenResponse {
  created_at: number;
}

/**
 * Token persistence is intentionally sessionStorage-only for the App Review
 * demo — we do not persist to Supabase until the submission is approved.
 */
export function saveInstagramBusinessToken(token: InstagramBusinessTokenResponse): void {
  if (typeof window === 'undefined') return;
  const payload: StoredInstagramBusinessToken = {
    ...token,
    created_at: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readInstagramBusinessToken(): StoredInstagramBusinessToken | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredInstagramBusinessToken;
  } catch {
    return null;
  }
}

export function clearInstagramBusinessToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
