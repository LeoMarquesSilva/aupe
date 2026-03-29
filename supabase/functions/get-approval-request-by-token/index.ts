// Edge Function: Returns approval request data for the client approval page (public link).
// Usage: GET /get-approval-request-by-token?token=xxx
// Security: token validated (format + exists + not expired). No credentials in response.

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

  const rl = rateLimitByKey(`approval-by-token:${clientIp(req)}`, 60, 60_000);
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

    const { data: requestRow, error: requestError } = await supabase
      .from('approval_requests')
      .select('id, client_id, expires_at')
      .eq('token', token)
      .gt('expires_at', now)
      .single();

    if (requestError || !requestRow) {
      return invalidTokenResponse();
    }

    const clientId = requestRow.client_id;

    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('id, name, instagram, logo_url, profile_picture')
      .eq('id', clientId)
      .single();

    if (clientError || !clientRow) {
      return invalidTokenResponse();
    }

    const { data: junctionRows, error: junctionError } = await supabase
      .from('approval_request_posts')
      .select('scheduled_post_id, sort_order')
      .eq('approval_request_id', requestRow.id)
      .order('sort_order', { ascending: true });

    if (junctionError || !junctionRows?.length) {
      return new Response(
        JSON.stringify({
          client: {
            id: clientRow.id,
            name: clientRow.name,
            instagram: clientRow.instagram,
            logoUrl: clientRow.logo_url ?? undefined,
            profilePicture: clientRow.profile_picture ?? undefined,
          },
          posts: [],
          expiresAt: requestRow.expires_at,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const postIds = junctionRows.map((r: { scheduled_post_id: string }) => r.scheduled_post_id);
    const { data: postsRows, error: postsError } = await supabase
      .from('scheduled_posts')
      .select(
        'id, caption, images, video, cover_image, post_type, scheduled_date, approval_status, approval_feedback, approval_responded_at, posting_platform, approval_feedback_attachments'
      )
      .in('id', postIds)
      .eq('client_id', clientId);

    if (postsError || !postsRows?.length) {
      return new Response(
        JSON.stringify({
          client: {
            id: clientRow.id,
            name: clientRow.name,
            instagram: clientRow.instagram,
            logoUrl: clientRow.logo_url ?? undefined,
            profilePicture: clientRow.profile_picture ?? undefined,
          },
          posts: [],
          expiresAt: requestRow.expires_at,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    type PostRow = Record<string, unknown> & { id: string; scheduled_date?: string | null };
    const posts = (postsRows as PostRow[])
      .sort((a, b) => {
        const ta = a.scheduled_date ? new Date(a.scheduled_date as string).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.scheduled_date ? new Date(b.scheduled_date as string).getTime() : Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
      })
      .map((row: Record<string, unknown>) => {
        const attachments = row.approval_feedback_attachments;
        const attachmentUrls = Array.isArray(attachments)
          ? attachments.filter((x): x is string => typeof x === 'string')
          : [];
        return {
          id: row.id,
          caption: row.caption ?? '',
          images: row.images ?? [],
          video: row.video ?? undefined,
          coverImage: row.cover_image ?? undefined,
          postType: row.post_type ?? 'post',
          postingPlatform: row.posting_platform === 'linkedin' ? 'linkedin' : 'instagram',
          scheduledDate: row.scheduled_date,
          approvalStatus: row.approval_status ?? 'pending',
          approvalFeedback: row.approval_feedback ?? undefined,
          approvalFeedbackAttachments: attachmentUrls.length ? attachmentUrls : undefined,
          approvalRespondedAt: row.approval_responded_at ?? undefined,
        };
      });

    return new Response(
      JSON.stringify({
        client: {
          id: clientRow.id,
          name: clientRow.name,
          instagram: clientRow.instagram,
          logoUrl: clientRow.logo_url ?? undefined,
          profilePicture: clientRow.profile_picture ?? undefined,
        },
        posts,
        expiresAt: requestRow.expires_at,
      }),
      {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('get-approval-request-by-token error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao carregar dados.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
