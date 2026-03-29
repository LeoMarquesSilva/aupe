// Renova tokens long-lived do Instagram (graph.instagram.com/refresh_access_token).
// Proteção: header X-Cron-Secret deve igualar INSTAGRAM_REFRESH_CRON_SECRET.
// Só atualiza clientes com instagram_long_lived_issued_at <= now() - 24h e token_expiry <= now() + 14 dias.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from '../_shared/cors.ts';
import { redactOAuthLike } from '../_shared/redact.ts';

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders: 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

  const expected = Deno.env.get('INSTAGRAM_REFRESH_CRON_SECRET') || '';
  const sent = req.headers.get('x-cron-secret') || '';
  if (!expected || sent !== expected) {
    return jr({ message: 'Forbidden' }, 403);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) {
    return jr({ message: 'Supabase não configurado' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const refreshBefore = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const issuedBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: qErr } = await admin
    .from('clients')
    .select('id, access_token, token_expiry, instagram_long_lived_issued_at')
    .not('access_token', 'is', null)
    .not('instagram_account_id', 'is', null);

  if (qErr) {
    console.error(qErr);
    return jr({ message: 'Erro ao consultar clientes' }, 500);
  }

  const refreshDeadline = new Date(refreshBefore).getTime();

  let ok = 0;
  let fail = 0;
  const errors: string[] = [];

  for (const row of rows || []) {
    const exp = row.token_expiry ? new Date(row.token_expiry as string).getTime() : 0;
    if (exp > refreshDeadline) {
      continue;
    }

    const issued = row.instagram_long_lived_issued_at;
    if (issued && new Date(issued as string) > new Date(issuedBefore)) {
      continue;
    }

    const token = row.access_token as string;
    try {
      const url = new URL('https://graph.instagram.com/refresh_access_token');
      url.searchParams.set('grant_type', 'ig_refresh_token');
      url.searchParams.set('access_token', token);

      const res = await fetch(url.toString());
      const j = await res.json();

      if (!res.ok || !j.access_token) {
        fail++;
        errors.push(`${row.id}: ${JSON.stringify(redactOAuthLike(j))}`);
        continue;
      }

      const expiresIn = Number(j.expires_in) || 5184000;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      const { error: uErr } = await admin
        .from('clients')
        .update({
          access_token: j.access_token,
          token_expiry: tokenExpiry,
          instagram_long_lived_issued_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (uErr) {
        fail++;
        errors.push(`${row.id}: ${uErr.message}`);
      } else {
        ok++;
      }
    } catch (e) {
      fail++;
      errors.push(`${row.id}: ${(e as Error).message}`);
    }
  }

  return jr({
    processed: (rows || []).length,
    refreshed: ok,
    failed: fail,
    errors: errors.slice(0, 20),
  });
});
