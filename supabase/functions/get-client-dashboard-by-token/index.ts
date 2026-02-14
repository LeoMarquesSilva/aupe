// Edge Function: Retorna dados do dashboard do cliente para visualização por link temporário
// Uso: GET /get-client-dashboard-by-token?token=xxx
//
// Segurança:
// - Apenas GET; token validado (formato + existência + expiração).
// - Resposta idêntica para token inválido/expirado/inexistente (404) para não vazar informação.
// - Cliente retorna só id, name, instagram, logo_url (nunca access_token ou credenciais).
// - Em produção, considere: rate limiting por IP (ex.: no API Gateway) e CORS restrito (ALLOWED_ORIGINS).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;
const VALID_TOKEN_REGEX = /^[a-zA-Z0-9]+$/;

function corsHeaders(): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGINS');
  return {
    'Access-Control-Allow-Origin': allowed && allowed.trim() !== '' ? allowed.trim() : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function invalidTokenResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Link inválido ou expirado.' }),
    { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const rawToken = url.searchParams.get('token');

  if (!rawToken || typeof rawToken !== 'string') {
    return invalidTokenResponse();
  }

  const token = rawToken.trim();
  if (
    token.length < MIN_TOKEN_LENGTH ||
    token.length > MAX_TOKEN_LENGTH ||
    !VALID_TOKEN_REGEX.test(token)
  ) {
    return invalidTokenResponse();
  }

  try {
    const now = new Date().toISOString();

    const { data: linkRow, error: linkError } = await supabase
      .from('client_share_links')
      .select('id, client_id, expires_at, access_count')
      .eq('token', token)
      .gt('expires_at', now)
      .single();

    if (linkError || !linkRow) {
      return invalidTokenResponse();
    }

    const clientId = linkRow.client_id;

    const [{ data: clientRow, error: clientError }, { data: profileRow }, { data: postsRows }, { data: statusRow }] = await Promise.all([
      supabase.from('clients').select('id, name, instagram, logo_url, profile_picture').eq('id', clientId).single(),
      supabase.from('instagram_profile_cache').select('profile_data, last_updated').eq('client_id', clientId).single(),
      supabase.from('instagram_posts_cache').select('post_data, last_updated').eq('client_id', clientId).order('last_updated', { ascending: false }),
      supabase.from('instagram_cache_status').select('last_full_sync, posts_count, sync_status, error_message').eq('client_id', clientId).single(),
    ]);

    if (clientError || !clientRow) {
      return invalidTokenResponse();
    }

    const client = {
      id: clientRow.id,
      name: clientRow.name,
      instagram: clientRow.instagram,
      logoUrl: clientRow.logo_url ?? undefined,
      profilePicture: clientRow.profile_picture ?? undefined,
    };

    const profile = profileRow?.profile_data ?? null;
    const posts = (postsRows ?? []).map((r: { post_data: unknown }) => r.post_data);
    const cacheStatus = statusRow
      ? {
          clientId,
          lastFullSync: statusRow.last_full_sync,
          postsCount: statusRow.posts_count ?? 0,
          syncStatus: statusRow.sync_status ?? 'completed',
          errorMessage: statusRow.error_message ?? undefined,
        }
      : {
          clientId,
          lastFullSync: null,
          postsCount: 0,
          syncStatus: 'completed' as const,
        };

    // Contar este acesso (incremento assíncrono, não bloqueia a resposta)
    supabase
      .from('client_share_links')
      .update({ access_count: (linkRow.access_count ?? 0) + 1 })
      .eq('id', linkRow.id)
      .then(() => {})
      .catch((err) => console.error('access_count increment error:', err));

    return new Response(
      JSON.stringify({
        client,
        profile,
        posts,
        cacheStatus,
        expiresAt: linkRow.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('get-client-dashboard-by-token error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao carregar dados.' }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
