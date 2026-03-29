// Edge Function: troca code OAuth (Business Login for Instagram) -> token long-lived
// Se clientId fornecido, salva diretamente no banco (service role, bypass RLS).
// JWT opcional (popup pode ter sessão stale).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { edgeDebugLog, redactOAuthLike } from '../_shared/redact.ts';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';

async function exchangeLongLivedToken(shortLivedToken: string, appSecret: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  // Tentar GET primeiro (docs oficiais), fallback para POST se falhar
  let getJson: Record<string, unknown> = {};
  try {
    const getUrl = `https://graph.instagram.com/access_token?${params.toString()}`;
    const getRes = await fetch(getUrl);
    getJson = await getRes.json();
    if (getRes.ok && getJson.access_token) {
      edgeDebugLog('Long-lived via GET OK');
      return getJson;
    }
    console.warn('Long-lived GET falhou:', getRes.status, JSON.stringify(redactOAuthLike(getJson)));
  } catch (e) {
    console.error('Long-lived GET exception:', (e as Error).message);
  }

  let postJson: Record<string, unknown> = {};
  try {
    const postRes = await fetch('https://graph.instagram.com/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    postJson = await postRes.json();
    if (postRes.ok && postJson.access_token) {
      edgeDebugLog('Long-lived via POST OK');
      return postJson;
    }
    console.warn('Long-lived POST falhou:', postRes.status, JSON.stringify(redactOAuthLike(postJson)));
  } catch (e) {
    console.error('Long-lived POST exception:', (e as Error).message);
  }

  const errMsg =
    (postJson?.error as Record<string, unknown>)?.message ||
    (getJson?.error as Record<string, unknown>)?.message ||
    'Falha ao obter token longo (GET e POST falharam)';
  throw new Error(String(errMsg));
}

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders: 'authorization, x-client-info, apikey, content-type',
    allowMethods: 'POST, OPTIONS',
  });
  if (co instanceof Response) return co;
  const cors = co;

  const jr = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return jr({ message: 'Method not allowed' }, 405);
  }

  const rl = rateLimitByKey(`ig-oauth-ex:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ message: 'Muitas requisições. Tente em instantes.' }), {
      status: 429,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfterSec),
      },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const appId = Deno.env.get('INSTAGRAM_APP_ID') || '';
  const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET') || '';

  if (!appId || !appSecret) {
    return jr({ message: 'Servidor OAuth não configurado (secrets Meta)' }, 500);
  }

  // JWT opcional — segurança vem do code Instagram (single-use) + apikey
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const jwt = authHeader.slice(7);
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await sb.auth.getUser(jwt);
      if (data?.user) {
        edgeDebugLog('Authenticated user:', data.user.id);
      }
    } catch {
      console.warn('JWT inválido/expirado — prosseguindo');
    }
  }

  let body: { code?: string; redirectUri?: string; clientId?: string };
  try {
    body = await req.json();
  } catch {
    return jr({ message: 'JSON inválido' }, 400);
  }

  const rawCode = body.code?.trim();
  if (!rawCode) {
    return jr({ message: 'Código de autorização não fornecido' }, 400);
  }

  const code = rawCode.replace(/#_$/, '').replace(/#$/, '');
  const defaultRedirect = Deno.env.get('INSTAGRAM_REDIRECT_URI') || '';
  const redirectUri = (body.redirectUri || defaultRedirect).trim();
  if (!redirectUri) {
    return jr({ message: 'redirectUri obrigatório' }, 400);
  }

  const clientId = body.clientId?.trim() || null;

  try {
    // 1) Trocar code por short-lived token
    const form = new FormData();
    form.append('client_id', appId);
    form.append('client_secret', appSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', redirectUri);
    form.append('code', code);

    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortJson = await shortRes.json();

    if (!shortRes.ok) {
      console.error('Short-lived token error:', redactOAuthLike(shortJson));
      return jr({
        message: shortJson.error_message || 'Falha ao trocar código por token',
      }, 400);
    }

    const row = Array.isArray(shortJson.data) ? shortJson.data[0] : shortJson;
    const shortLivedToken = row?.access_token as string | undefined;
    const scopedUserId = row?.user_id != null ? String(row.user_id) : '';

    if (!shortLivedToken) {
      return jr({ message: 'Resposta OAuth sem access_token' }, 502);
    }

    // 2) Trocar short-lived por long-lived (GET com fallback POST)
    let longLivedToken = shortLivedToken;
    let expiresIn = 3600;
    let tokenType = 'short_lived';
    let longLivedError = '';
    try {
      const longJson = await exchangeLongLivedToken(shortLivedToken, appSecret);
      longLivedToken = longJson.access_token as string;
      expiresIn = Number(longJson.expires_in) || 5184000;
      tokenType = 'long_lived';
    } catch (longErr) {
      longLivedError = (longErr as Error).message;
      console.warn('Step 2 WARN: long-lived falhou:', longLivedError);
    }

    // 3) Buscar perfil do Instagram
    let username = '';
    let profilePicture = '';
    let followersCount = 0;
    let mediaCount = 0;
    let instagramAccountId = scopedUserId;

    const fields = 'id,username,profile_picture_url,followers_count,media_count';

    // Tentar graph.instagram.com primeiro (mais confiável com Business Login)
    const meUrl = `https://graph.instagram.com/v21.0/me?fields=${fields}&access_token=${encodeURIComponent(longLivedToken)}`;
    const meRes = await fetch(meUrl);
    const meJson = await meRes.json();

    if (meRes.ok && meJson && !meJson.error) {
      username = meJson.username || '';
      profilePicture = meJson.profile_picture_url || '';
      followersCount = Number(meJson.followers_count) || 0;
      mediaCount = Number(meJson.media_count) || 0;
      if (meJson.id) instagramAccountId = String(meJson.id);
    } else {
      // Fallback: graph.facebook.com
      const fbUrl = `https://graph.facebook.com/v21.0/${scopedUserId}?fields=${fields}&access_token=${encodeURIComponent(longLivedToken)}`;
      const fbRes = await fetch(fbUrl);
      const fbJson = await fbRes.json();
      if (fbRes.ok && fbJson && !fbJson.error) {
        username = fbJson.username || '';
        profilePicture = fbJson.profile_picture_url || '';
        followersCount = Number(fbJson.followers_count) || 0;
        mediaCount = Number(fbJson.media_count) || 0;
        if (fbJson.id) instagramAccountId = String(fbJson.id);
      }
    }

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const issuedAt = new Date().toISOString();
    const finalUsername = username || `user_${scopedUserId}`;

    // 4) Salvar no banco se clientId fornecido (service role bypassa RLS)
    let savedToDb = false;
    if (clientId && supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Buscar nome atual do cliente; se for placeholder, sobrescrever com username
      const { data: existingClient } = await adminClient
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .maybeSingle();

      const isPlaceholder = !existingClient?.name || existingClient.name.startsWith('novo_');
      const clientName = isPlaceholder ? finalUsername : existingClient.name;

      const { error: updateError } = await adminClient
        .from('clients')
        .update({
          name: clientName,
          instagram_account_id: instagramAccountId,
          access_token: longLivedToken,
          instagram: finalUsername,
          instagram_username: finalUsername,
          profile_picture: profilePicture,
          token_expiry: tokenExpiry,
          token_type: tokenType,
          page_id: null,
          page_name: 'Instagram',
          instagram_long_lived_issued_at: issuedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('Erro ao salvar no banco:', updateError);
      } else {
        savedToDb = true;
        edgeDebugLog(`Instagram auth salvo para client ${clientId}`);
      }
    }

    return jr({
      instagramAccountId,
      accessToken: longLivedToken,
      username: finalUsername,
      profilePicture,
      tokenExpiry,
      pageId: null,
      pageName: 'Instagram',
      expiresIn,
      issuedAt,
      followersCount,
      mediaCount,
      savedToDb,
      tokenType,
      ...(longLivedError ? { longLivedError } : {}),
    });
  } catch (e) {
    const errMsg = (e as Error).message || 'Erro interno desconhecido';
    console.error('Erro na Edge Function (mensagem apenas):', errMsg);
    return jr({ message: 'Erro interno ao processar OAuth. Tente novamente.' }, 500);
  }
});
