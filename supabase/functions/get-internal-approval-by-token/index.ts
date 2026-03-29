// Public page for gestor internal pre-approval (token only, no JWT).
// GET /get-internal-approval-by-token?token=xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;
const VALID_TOKEN_REGEX = /^[a-zA-Z0-9]+$/;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders: 'Content-Type, Authorization, apikey, x-client-info',
    allowMethods: 'GET, OPTIONS',
  });
  if (co instanceof Response) return co;
  const cors = co;

  const invalidTokenResponse = (): Response =>
    new Response(JSON.stringify({ error: 'Link inválido ou expirado.' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const rl = rateLimitByKey(`internal-approval-by-token:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Muitas requisições. Tente mais tarde.' }), {
      status: 429,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfterSec),
      },
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
      .from('internal_approval_links')
      .select('id, organization_id, expires_at, label')
      .eq('token', token)
      .gt('expires_at', now)
      .single();

    if (linkError || !linkRow) {
      return invalidTokenResponse();
    }

    const { data: orgRow, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', linkRow.organization_id)
      .single();

    if (orgError || !orgRow) {
      return invalidTokenResponse();
    }

    const { data: junctionRows, error: junctionError } = await supabase
      .from('internal_approval_link_posts')
      .select('scheduled_post_id, sort_order')
      .eq('internal_approval_link_id', linkRow.id)
      .order('sort_order', { ascending: true });

    if (junctionError || !junctionRows?.length) {
      return new Response(
        JSON.stringify({
          organization: { id: orgRow.id, name: orgRow.name },
          label: linkRow.label ?? undefined,
          posts: [],
          expiresAt: linkRow.expires_at,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const postIds = junctionRows.map((r: { scheduled_post_id: string }) => r.scheduled_post_id);

    const { data: postsRows, error: postsError } = await supabase
      .from('scheduled_posts')
      .select(
        'id, caption, images, video, cover_image, post_type, scheduled_date, posting_platform, client_id, requires_internal_approval, internal_approval_status, internal_approval_comment'
      )
      .in('id', postIds)
      .eq('organization_id', linkRow.organization_id);

    if (postsError || !postsRows?.length) {
      return new Response(
        JSON.stringify({
          organization: { id: orgRow.id, name: orgRow.name },
          label: linkRow.label ?? undefined,
          posts: [],
          expiresAt: linkRow.expires_at,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const clientIds = [
      ...new Set(
        (postsRows as { client_id?: string | null }[])
          .map((p) => p.client_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0)
      ),
    ];
    const clientNameById = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase.from('clients').select('id, name').in('id', clientIds);
      for (const c of clientsData ?? []) {
        clientNameById.set(c.id, c.name ?? 'Cliente');
      }
    }

    type Row = Record<string, unknown> & { id: string; scheduled_date?: string | null };
    const posts = (postsRows as Row[])
      .sort((a, b) => {
        const ta = a.scheduled_date ? new Date(a.scheduled_date as string).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.scheduled_date ? new Date(b.scheduled_date as string).getTime() : Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      })
      .map((row: Record<string, unknown>) => {
        const cid = row.client_id as string | null | undefined;
        return {
          id: row.id,
          caption: row.caption ?? '',
          images: row.images ?? [],
          video: row.video ?? undefined,
          coverImage: row.cover_image ?? undefined,
          postType: row.post_type ?? 'post',
          postingPlatform: row.posting_platform === 'linkedin' ? 'linkedin' : 'instagram',
          scheduledDate: row.scheduled_date,
          clientName: cid ? clientNameById.get(cid) ?? 'Cliente' : 'Cliente',
          internalApprovalStatus: row.internal_approval_status ?? 'pending',
          internalApprovalComment: row.internal_approval_comment ?? undefined,
        };
      });

    return new Response(
      JSON.stringify({
        organization: { id: orgRow.id, name: orgRow.name },
        label: linkRow.label ?? undefined,
        posts,
        expiresAt: linkRow.expires_at,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-internal-approval-by-token error:', err);
    return new Response(JSON.stringify({ error: 'Erro ao carregar dados.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
