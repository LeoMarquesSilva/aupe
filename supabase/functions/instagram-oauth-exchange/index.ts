// Edge Function: troca code OAuth (Business Login for Instagram) → token long-lived
// Segredos: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET (Instagram App ID/Secret do painel Meta)
// Requer JWT do usuário (Supabase Auth).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IG_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
].join(',');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const appId = Deno.env.get('INSTAGRAM_APP_ID') || '';
  const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET') || '';

  if (!appId || !appSecret) {
    console.error('INSTAGRAM_APP_ID ou INSTAGRAM_APP_SECRET não configurados');
    return jsonResponse({ message: 'Servidor OAuth não configurado (secrets Meta)' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ message: 'Não autorizado' }, 401);
  }

  const jwt = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return jsonResponse({ message: 'Sessão inválida' }, 401);
  }

  let body: { code?: string; redirectUri?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ message: 'JSON inválido' }, 400);
  }

  const rawCode = body.code?.trim();
  if (!rawCode) {
    return jsonResponse({ message: 'Código de autorização não fornecido' }, 400);
  }

  const code = rawCode.replace(/#_$/, '').replace(/#$/, '');
  const defaultRedirect = Deno.env.get('INSTAGRAM_REDIRECT_URI') || '';
  const redirectUri = (body.redirectUri || defaultRedirect).trim();
  if (!redirectUri) {
    return jsonResponse({ message: 'redirectUri é obrigatório se INSTAGRAM_REDIRECT_URI não estiver definido' }, 400);
  }

  try {
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
      console.error('Instagram short-lived error:', shortJson);
      return jsonResponse(
        {
          message: shortJson.error_message || 'Falha ao trocar código por token',
          details: shortJson,
        },
        400,
      );
    }

    const row = Array.isArray(shortJson.data) ? shortJson.data[0] : shortJson;
    const shortLivedToken = row?.access_token as string | undefined;
    const scopedUserId = row?.user_id != null ? String(row.user_id) : '';

    if (!shortLivedToken) {
      return jsonResponse({ message: 'Resposta OAuth sem access_token', details: shortJson }, 502);
    }

    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('access_token', shortLivedToken);

    const longRes = await fetch(longUrl.toString());
    const longJson = await longRes.json();

    if (!longRes.ok) {
      console.error('Instagram long-lived error:', longJson);
      return jsonResponse(
        { message: longJson.error?.message || 'Falha ao obter token longo', details: longJson },
        502,
      );
    }

    const longLivedToken = longJson.access_token as string;
    const expiresIn = Number(longJson.expires_in) || 5184000;

    if (!longLivedToken) {
      return jsonResponse({ message: 'Token longo ausente na resposta' }, 502);
    }

    let username = '';
    let profilePicture = '';
    let followersCount = 0;
    let mediaCount = 0;
    let instagramAccountId = scopedUserId;

    const profileUrl = new URL(`https://graph.facebook.com/v21.0/${scopedUserId}`);
    profileUrl.searchParams.set(
      'fields',
      'username,profile_picture_url,followers_count,media_count',
    );
    profileUrl.searchParams.set('access_token', longLivedToken);

    const profRes = await fetch(profileUrl.toString());
    const profJson = await profRes.json();

    if (profRes.ok && profJson && !profJson.error) {
      username = profJson.username || '';
      profilePicture = profJson.profile_picture_url || '';
      followersCount = Number(profJson.followers_count) || 0;
      mediaCount = Number(profJson.media_count) || 0;
      if (profJson.id) instagramAccountId = String(profJson.id);
    } else {
      const meUrl = new URL('https://graph.instagram.com/v21.0/me');
      meUrl.searchParams.set('fields', 'id,username,profile_picture_url,followers_count,media_count');
      meUrl.searchParams.set('access_token', longLivedToken);
      const meRes = await fetch(meUrl.toString());
      const meJson = await meRes.json();
      if (meRes.ok && meJson && !meJson.error) {
        username = meJson.username || '';
        profilePicture = meJson.profile_picture_url || '';
        followersCount = Number(meJson.followers_count) || 0;
        mediaCount = Number(meJson.media_count) || 0;
        if (meJson.id) instagramAccountId = String(meJson.id);
      }
    }

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const issuedAt = new Date().toISOString();

    return jsonResponse({
      instagramAccountId,
      accessToken: longLivedToken,
      username: username || `user_${scopedUserId}`,
      profilePicture,
      tokenExpiry,
      pageId: null,
      pageName: 'Instagram',
      expiresIn,
      issuedAt,
      followersCount,
      mediaCount,
      authMethod: 'instagram_business_login',
      requestedScopes: IG_SCOPES,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ message: (e as Error).message || 'Erro interno' }, 500);
  }
});
