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

/**
 * Scopes requested at the authorize step.
 *
 * Only the scopes we actively demonstrate in the App Review screencast.
 * Meta rejects submissions that request a permission without showing it
 * being used end-to-end in the recording, so we keep this list minimal:
 *
 *   - instagram_business_basic           — read profile (Section A)
 *   - instagram_business_content_publish — publish a photo/video (Section B)
 *   - instagram_business_manage_insights — read media insights (Section C)
 *
 * If you ever add `instagram_business_manage_messages` or
 * `instagram_business_manage_comments` back, you MUST add corresponding
 * sections to InstagramBusinessDemo.tsx that exercise those permissions.
 */
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
 * Returns the redirect URI WITHOUT a trailing slash.
 *
 * IMPORTANT: this MUST be byte-identical to the value listed under
 *   Products > Instagram > API setup with Instagram business login >
 *   Business login configuration > "OAuth redirect URIs"
 * AND to the `redirect_uri` shown in that page's "Embedded URL" preview.
 *
 * The embedded URL preview Meta generates uses NO trailing slash, e.g.:
 *   https://www.insyt.com.br/callback/instagram-business
 *
 * That is the canonical form the dashboard stores. Sending a trailing-slash
 * variant from our app will be rejected with the famously misleading
 * "Error validating verification code. Please make sure your redirect_uri
 *  is identical to the one you used in the OAuth dialog request."
 */
export function getInstagramBusinessRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/callback/instagram-business`;
}

/**
 * Build the authorization URL for Instagram Business Login.
 *
 * This is constructed to be byte-identical (modulo `state`) to the
 * "Embedded URL" preview shown by the Meta App Dashboard under
 *   Products > Instagram > API setup with Instagram business login >
 *   Business login configuration.
 *
 * Parameter order, scope list and `force_reauth=true` are preserved
 * intentionally — Instagram occasionally rejects requests whose scope list
 * does not match the dashboard preview with a misleading
 * "Error validating verification code" message.
 */
export function getInstagramBusinessAuthUrl(state?: string): string {
  const appId = getInstagramBusinessAppId();
  const redirectUri = getInstagramBusinessRedirectUri();
  if (!redirectUri) {
    throw new Error('window.location.origin is required to build redirect URI.');
  }
  const scope = INSTAGRAM_BUSINESS_SCOPES.join(',');

  // Preserve insertion order so the resulting URL matches the dashboard preview:
  // force_reauth, client_id, redirect_uri, response_type, scope, [state]
  const params = new URLSearchParams();
  params.set('force_reauth', 'true');
  params.set('client_id', appId);
  params.set('redirect_uri', redirectUri);
  params.set('response_type', 'code');
  params.set('scope', scope);
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
    'scopes:',
    scope,
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

  return publishContainer(userId, creationId, accessToken);
}

export interface PublishVideoArgs {
  userId: string;
  videoUrl: string;
  caption?: string;
  accessToken: string;
  /**
   * Whether the Reel should be shared to the main feed (default `true`).
   * Maps to the `share_to_feed` parameter on the container endpoint.
   */
  shareToFeed?: boolean;
  /**
   * Optional callback fired with the container status while we poll.
   * Useful for showing "Processing video... (IN_PROGRESS)" in the UI.
   */
  onStatusUpdate?: (status: string) => void;
}

/**
 * Three-step publish flow for Reels (`instagram_business_content_publish`):
 *  1. Create a media container with `media_type=REELS` and `video_url`.
 *  2. Poll the container's `status_code` until it is `FINISHED`
 *     (Instagram needs to download & transcode the video first).
 *  3. Publish the container with `media_publish`.
 */
export async function publishInstagramVideo(
  args: PublishVideoArgs,
): Promise<{ id: string; permalink?: string }> {
  const { userId, videoUrl, caption, accessToken, shareToFeed = true, onStatusUpdate } = args;

  const createBody = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    share_to_feed: shareToFeed ? 'true' : 'false',
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
    throw new Error(`Reel container creation failed: ${text.slice(0, 400)}`);
  }
  const { id: creationId } = (await createRes.json()) as { id: string };

  // Poll status_code until FINISHED (or fail). Reels typically take 10-60s
  // depending on video length. We poll every 4s for up to 5 minutes.
  const maxAttempts = 75;
  const pollIntervalMs = 4000;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const statusRes = await fetch(
      `${GRAPH_IG_BASE}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(
        accessToken,
      )}`,
    );
    if (!statusRes.ok) {
      const text = await statusRes.text();
      throw new Error(`Reel status check failed: ${text.slice(0, 400)}`);
    }
    const statusJson = (await statusRes.json()) as { status_code?: string; status?: string };
    const code = statusJson.status_code || statusJson.status || 'UNKNOWN';
    onStatusUpdate?.(code);
    if (code === 'FINISHED') break;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`Reel processing ${code}: ${statusJson.status || ''}`);
    }
  }

  return publishContainer(userId, creationId, accessToken);
}

/**
 * Internal: publish a previously-created container and resolve its permalink.
 * Shared between image and video flows.
 */
async function publishContainer(
  userId: string,
  creationId: string,
  accessToken: string,
): Promise<{ id: string; permalink?: string }> {
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
