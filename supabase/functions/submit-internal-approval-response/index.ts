// Gestor submits internal approve/reject via public token (no JWT).
// POST /submit-internal-approval-response { token, postId, action, comment? }
// Notifica WhatsApp no destino `internal_approval_phone` (quando preenchido e notificações ativas).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;
const VALID_TOKEN_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_COMMENT_LENGTH = 2000;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    Vary: 'Origin',
  };
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function formatDateTimeBr(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace(',', ' às');
}

function mapPostTypeLabel(postType?: string | null): string {
  switch (postType) {
    case 'reels':
      return 'Reel';
    case 'stories':
      return 'Story';
    case 'carousel':
      return 'Carrossel';
    case 'post':
      return 'Post';
    case 'roteiro':
      return 'Roteiro';
    default:
      return postType || 'Post';
  }
}

interface PostNotifyFields {
  organization_id: string;
  caption: string | null;
  client_id: string | null;
  scheduled_date: string | null;
  post_type: string | null;
  posting_platform: string | null;
}

async function sendGestorLinkWhatsAppNotification(
  sb: typeof supabase,
  post: PostNotifyFields,
  action: 'approve' | 'reject',
  comment: string,
  linkLabel: string | null,
  linkCreatedAt: string | null
): Promise<void> {
  try {
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      console.warn('[WhatsApp interno] EVOLUTION_BASE_URL ou EVOLUTION_API_KEY ausente.');
      return;
    }

    const { data: waCfg, error: waErr } = await sb
      .from('whatsapp_config')
      .select('instance_name, internal_approval_phone, enabled')
      .eq('organization_id', post.organization_id)
      .eq('enabled', true)
      .maybeSingle();

    if (waErr) {
      console.error('[WhatsApp interno] Erro config:', waErr.message);
      return;
    }

    const dest =
      typeof waCfg?.internal_approval_phone === 'string' ? waCfg.internal_approval_phone.trim() : '';
    if (!waCfg?.instance_name || !dest) {
      console.warn(
        '[WhatsApp interno] Sem destino (internal_approval_phone) ou instância — não enviando.'
      );
      return;
    }

    let clientName = 'Cliente';
    if (post.client_id) {
      const { data: clientRow } = await sb.from('clients').select('name').eq('id', post.client_id).maybeSingle();
      if (clientRow?.name) clientName = clientRow.name;
    }

    const captionSnippet =
      typeof post.caption === 'string' && post.caption.trim()
        ? post.caption.trim().slice(0, 80) + (post.caption.trim().length > 80 ? '…' : '')
        : '(sem legenda)';
    const postTypeLabel = mapPostTypeLabel(post.post_type);
    const scheduledAtLabel = formatDateTimeBr(post.scheduled_date);
    const linkCreatedLabel = formatDateTimeBr(linkCreatedAt);
    const requestLabelText = linkLabel?.trim() ? linkLabel.trim() : null;
    const respondedAtLabel = formatDateTimeBr(new Date().toISOString());
    const isLinkedIn = post.posting_platform === 'linkedin';

    let text: string;
    if (action === 'approve') {
      text =
        `✅ *Revisão interna — gestor aprovou*\n\n` +
        `👤 Cliente: ${clientName}\n` +
        `📝 Post: ${captionSnippet}\n` +
        `🎬 Tipo: ${postTypeLabel}\n` +
        `${isLinkedIn ? `📱 Plataforma: LinkedIn\n` : ''}` +
        `📅 Agendado: ${scheduledAtLabel}\n` +
        `🔗 Link interno criado em: ${linkCreatedLabel}` +
        `${requestLabelText ? `\n🏷️ Lote: ${requestLabelText}` : ''}` +
        `\n⏱️ Resposta do gestor: ${respondedAtLabel}\n\n` +
        `O conteúdo pode seguir para o link de aprovação do cliente.`;
    } else {
      const cmt = comment.trim() ? `\n\n💬 Comentário do gestor: ${comment.trim()}` : '';
      text =
        `⚠️ *Revisão interna — ajustes solicitados pelo gestor*\n\n` +
        `👤 Cliente: ${clientName}\n` +
        `📝 Post: ${captionSnippet}\n` +
        `🎬 Tipo: ${postTypeLabel}\n` +
        `${isLinkedIn ? `📱 Plataforma: LinkedIn\n` : ''}` +
        `📅 Agendado: ${scheduledAtLabel}\n` +
        `🔗 Link interno criado em: ${linkCreatedLabel}` +
        `${requestLabelText ? `\n🏷️ Lote: ${requestLabelText}` : ''}` +
        `\n⏱️ Resposta do gestor: ${respondedAtLabel}` +
        `${cmt}\n\n` +
        `Revise o conteúdo antes de enviar ao cliente.`;
    }

    const apiUrl = `${EVOLUTION_BASE_URL}/message/sendText/${waCfg.instance_name}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: dest, text }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[WhatsApp interno] Evolution API:', res.status, errBody);
      return;
    }
    console.log('[WhatsApp interno] Notificação enviada para', dest);
  } catch (err) {
    console.error('[WhatsApp interno] Erro (non-fatal):', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse('Método não permitido', 405);
  }

  let body: { token?: string; postId?: string; action?: string; comment?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return errorResponse('Corpo inválido.', 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;
  const rawComment = typeof body.comment === 'string' ? body.comment : '';
  const comment = rawComment.trim().slice(0, MAX_COMMENT_LENGTH);

  if (action === 'reject' && rawComment.trim().length > MAX_COMMENT_LENGTH) {
    return errorResponse(`Comentário muito longo. Máximo ${MAX_COMMENT_LENGTH} caracteres.`, 400);
  }

  if (
    !token ||
    token.length < MIN_TOKEN_LENGTH ||
    token.length > MAX_TOKEN_LENGTH ||
    !VALID_TOKEN_REGEX.test(token)
  ) {
    return errorResponse('Link inválido ou expirado.', 404);
  }

  if (!postId || !action) {
    return errorResponse('postId e action são obrigatórios.', 400);
  }

  try {
    const now = new Date().toISOString();

    const { data: linkRow, error: linkError } = await supabase
      .from('internal_approval_links')
      .select('id, label, created_at')
      .eq('token', token)
      .gt('expires_at', now)
      .single();

    if (linkError || !linkRow) {
      return errorResponse('Link inválido ou expirado.', 404);
    }

    const { data: junctionRow, error: junctionError } = await supabase
      .from('internal_approval_link_posts')
      .select('id')
      .eq('internal_approval_link_id', linkRow.id)
      .eq('scheduled_post_id', postId)
      .maybeSingle();

    if (junctionError || !junctionRow) {
      return errorResponse('Post não encontrado nesta solicitação.', 404);
    }

    const { data: postRow, error: postError } = await supabase
      .from('scheduled_posts')
      .select(
        'requires_internal_approval, internal_approval_status, organization_id, caption, client_id, scheduled_date, post_type, posting_platform'
      )
      .eq('id', postId)
      .single();

    if (postError || !postRow) {
      return errorResponse('Post não encontrado.', 404);
    }

    if (!postRow.requires_internal_approval) {
      return errorResponse('Este post não exige revisão interna.', 400);
    }

    const current = postRow.internal_approval_status as string | null;
    if (current && current !== 'pending') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Este item já foi revisado anteriormente.',
        }),
        { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const updatePayload =
      action === 'approve'
        ? {
            internal_approval_status: 'approved' as const,
            internal_approval_comment: null,
          }
        : {
            internal_approval_status: 'rejected' as const,
            internal_approval_comment: comment || null,
          };

    const { data: updatedRows, error: updateError } = await supabase
      .from('scheduled_posts')
      .update(updatePayload)
      .eq('id', postId)
      .select('id');

    if (updateError) {
      console.error(`submit-internal-approval-response ${action}:`, updateError);
      return errorResponse(
        action === 'approve' ? 'Erro ao registrar aprovação.' : 'Erro ao registrar reprovação.',
        500
      );
    }

    if (!updatedRows?.length) {
      console.error(
        'submit-internal-approval-response: zero rows updated for postId=',
        postId
      );
      return errorResponse(
        'Não foi possível atualizar o post no banco. Verifique se o post ainda existe.',
        500
      );
    }

    const postForNotify: PostNotifyFields = {
      organization_id: postRow.organization_id as string,
      caption: postRow.caption as string | null,
      client_id: postRow.client_id as string | null,
      scheduled_date: postRow.scheduled_date as string | null,
      post_type: postRow.post_type as string | null,
      posting_platform: postRow.posting_platform as string | null,
    };

    if (postForNotify.organization_id) {
      await sendGestorLinkWhatsAppNotification(
        supabase,
        postForNotify,
        action,
        comment,
        (linkRow.label as string | null) ?? null,
        (linkRow.created_at as string | null) ?? null
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('submit-internal-approval-response error:', err);
    return errorResponse('Erro ao processar resposta.', 500);
  }
});
