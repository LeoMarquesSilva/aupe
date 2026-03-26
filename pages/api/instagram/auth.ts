import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Troca code (Business Login for Instagram) → token long-lived.
 * Secrets: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  const defaultRedirect = process.env.INSTAGRAM_REDIRECT_URI || '';

  if (!appId || !appSecret) {
    return res.status(500).json({ message: 'INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET não configurados' });
  }

  try {
    const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };
    if (!code?.trim()) {
      return res.status(400).json({ message: 'Código de autorização não fornecido' });
    }

    const cleanCode = String(code).trim().replace(/#_$/, '').replace(/#$/, '');
    const finalRedirectUri = (redirectUri || defaultRedirect).trim();
    if (!finalRedirectUri) {
      return res.status(400).json({ message: 'redirectUri obrigatório' });
    }

    const form = new FormData();
    form.append('client_id', appId);
    form.append('client_secret', appSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', finalRedirectUri);
    form.append('code', cleanCode);

    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortJson = await shortRes.json();

    if (!shortRes.ok) {
      return res.status(400).json({
        message: (shortJson as { error_message?: string }).error_message || 'Falha OAuth Instagram',
        details: shortJson,
      });
    }

    const row = Array.isArray((shortJson as { data?: unknown[] }).data)
      ? (shortJson as { data: Record<string, unknown>[] }).data[0]
      : (shortJson as Record<string, unknown>);
    const shortLivedToken = row?.access_token as string | undefined;
    const scopedUserId = row?.user_id != null ? String(row.user_id) : '';

    if (!shortLivedToken) {
      return res.status(502).json({ message: 'Resposta sem access_token', details: shortJson });
    }

    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('access_token', shortLivedToken);

    const longRes = await fetch(longUrl.toString());
    const longJson = await longRes.json();

    if (!longRes.ok || !(longJson as { access_token?: string }).access_token) {
      return res.status(502).json({
        message: (longJson as { error?: { message?: string } }).error?.message || 'Falha token longo',
        details: longJson,
      });
    }

    const longLivedToken = (longJson as { access_token: string }).access_token;
    const expiresIn = Number((longJson as { expires_in?: number }).expires_in) || 5184000;

    let username = '';
    let profilePicture = '';
    let instagramAccountId = scopedUserId;

    const profileUrl = new URL(`https://graph.facebook.com/v21.0/${scopedUserId}`);
    profileUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count,media_count');
    profileUrl.searchParams.set('access_token', longLivedToken);
    const profRes = await fetch(profileUrl.toString());
    const profJson = await profRes.json();

    if (profRes.ok && profJson && !(profJson as { error?: unknown }).error) {
      const p = profJson as Record<string, unknown>;
      username = String(p.username || '');
      profilePicture = String(p.profile_picture_url || '');
      if (p.id) instagramAccountId = String(p.id);
    } else {
      const meUrl = new URL('https://graph.instagram.com/v21.0/me');
      meUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count,media_count');
      meUrl.searchParams.set('access_token', longLivedToken);
      const meRes = await fetch(meUrl.toString());
      const meJson = await meRes.json();
      if (meRes.ok && meJson && !(meJson as { error?: unknown }).error) {
        const m = meJson as Record<string, unknown>;
        username = String(m.username || '');
        profilePicture = String(m.profile_picture_url || '');
        if (m.id) instagramAccountId = String(m.id);
      }
    }

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const issuedAt = new Date().toISOString();

    return res.status(200).json({
      instagramAccountId,
      accessToken: longLivedToken,
      username: username || `user_${scopedUserId}`,
      profilePicture,
      tokenExpiry,
      pageId: null,
      pageName: 'Instagram',
      expiresIn,
      issuedAt,
      authMethod: 'instagram_business_login',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error(error);
    return res.status(500).json({ message: msg });
  }
}
