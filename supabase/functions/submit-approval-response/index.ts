// Edge Function: Submit client approval/rejection for a post (public link).
// Usage: POST /submit-approval-response with body { token, postId, action: 'approve'|'reject', feedback?: string }
// Security: token validated; post must belong to that approval request.
// After status update, sends a WhatsApp notification via Evolution API if configured.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';
import { edgeDebugLog } from '../_shared/redact.ts';

const supabaseUrl        = Deno.env.get('SUPABASE_URL')             || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function isValidPublicAttachmentUrl(projectUrl: string, url: string): boolean {
  try {
    const origin = new URL(projectUrl).origin;
    const u = new URL(url);
    if (u.origin !== origin) return false;
    return u.pathname.includes('/object/public/approval-feedback/');
  } catch {
    return false;
  }
}

// Evolution API — set as Supabase Edge Function secrets (supabase secrets set ...)
const EVOLUTION_BASE_URL = (Deno.env.get('EVOLUTION_BASE_URL') || '').replace(/\/$/, '');
const EVOLUTION_API_KEY  = Deno.env.get('EVOLUTION_API_KEY')  || '';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;
const VALID_TOKEN_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_ATTACHMENT_URLS = 5;

interface ApprovalNotificationContext {
  respondedAt: string;
  requestCreatedAt?: string | null;
  requestCreatedBy?: string | null;
  requestLabel?: string | null;
  attachmentCount?: number;
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  }).format(date).replace(',', ' às');
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
    default:
      return postType || 'Post';
  }
}

async function sendWhatsAppNotification(
  supabaseClient: ReturnType<typeof createClient>,
  postId: string,
  action: 'approve' | 'reject',
  feedback?: string,
  context?: ApprovalNotificationContext
): Promise<void> {
  try {
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] EVOLUTION_BASE_URL ou EVOLUTION_API_KEY não configurados. Configure os secrets da Edge Function.');
      return;
    }

    const { data: postRow, error: postErr } = await supabaseClient
      .from('scheduled_posts')
      .select('organization_id, caption, client_id, scheduled_date, post_type, posting_platform')
      .eq('id', postId)
      .single();

    if (postErr || !postRow?.organization_id) {
      console.warn('[WhatsApp] Post não encontrado ou sem organization_id:', postErr?.message);
      return;
    }

    // Buscar nome do cliente se tiver client_id
    let clientName = 'Cliente';
    if (postRow.client_id) {
      const { data: clientRow } = await supabaseClient
        .from('clients')
        .select('name')
        .eq('id', postRow.client_id)
        .maybeSingle();
      if (clientRow?.name) clientName = clientRow.name;
    }

    let createdByLabel = '—';
    if (context?.requestCreatedBy) {
      const { data: creatorRow } = await supabaseClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', context.requestCreatedBy)
        .maybeSingle();
      createdByLabel = creatorRow?.full_name?.trim() || creatorRow?.email || '—';
    }

    const { data: waCfg, error: waErr } = await supabaseClient
      .from('whatsapp_config')
      .select('instance_name, phone_number, client_approval_phone')
      .eq('organization_id', postRow.organization_id)
      .eq('enabled', true)
      .maybeSingle();

    if (waErr) {
      console.error('[WhatsApp] Erro ao buscar config:', waErr.message);
      return;
    }
    const clientDestRaw =
      typeof waCfg?.client_approval_phone === 'string' ? waCfg.client_approval_phone.trim() : '';
    const defaultDestRaw = typeof waCfg?.phone_number === 'string' ? waCfg.phone_number.trim() : '';
    const notifyNumber = clientDestRaw || defaultDestRaw;
    if (!waCfg?.instance_name || !notifyNumber) {
      console.warn('[WhatsApp] Nenhuma config ou destino (cliente/principal) para organization_id:', postRow.organization_id);
      return;
    }

    const captionSnippet = typeof postRow.caption === 'string' && postRow.caption.trim()
      ? postRow.caption.trim().slice(0, 80) + (postRow.caption.trim().length > 80 ? '…' : '')
      : '(sem legenda)';
    const postTypeLabel = mapPostTypeLabel(postRow.post_type);
    const scheduledAtLabel = formatDateTimeBr(postRow.scheduled_date);
    const requestCreatedAtLabel = formatDateTimeBr(context?.requestCreatedAt);
    const respondedAtLabel = formatDateTimeBr(context?.respondedAt);
    const requestLabelText = context?.requestLabel?.trim() ? context.requestLabel.trim() : null;

    let text: string;
    const platform = postRow.posting_platform === 'linkedin' ? 'linkedin' : 'instagram';
    const isLinkedIn = platform === 'linkedin';
    const isRoteiro = postRow.post_type === 'roteiro';

    if (action === 'approve') {
      const footer = isLinkedIn
        ? 'Conteúdo LinkedIn aprovado (sem publicação automática no sistema).'
        : isRoteiro
          ? 'Roteiro aprovado para uso interno.'
          : 'Post liberado para publicação automática no horário agendado.';
      text =
        `✅ *Aprovação recebida!*\n\n` +
        `👤 Cliente: ${clientName}\n` +
        `📝 Post: ${captionSnippet}\n` +
        `🎬 Tipo: ${postTypeLabel}\n` +
        `${isLinkedIn ? `📱 Plataforma: LinkedIn\n` : ''}` +
        `📅 Agendado para: ${scheduledAtLabel}\n` +
        `🔗 Link gerado em: ${requestCreatedAtLabel}\n` +
        `👨‍💻 Gerado por: ${createdByLabel}\n` +
        `⏱️ Aprovado em: ${respondedAtLabel}` +
        `${requestLabelText ? `\n🏷️ Solicitação: ${requestLabelText}` : ''}` +
        `\n\n${footer}`;
    } else {
      const feedbackText = feedback?.trim() ? `\n\n💬 Feedback: ${feedback.trim()}` : '';
      text =
        `⚠️ *Ajustes solicitados*\n\n` +
        `👤 Cliente: ${clientName}\n` +
        `📝 Post: ${captionSnippet}\n` +
        `🎬 Tipo: ${postTypeLabel}\n` +
        `${isLinkedIn ? `📱 Plataforma: LinkedIn\n` : ''}` +
        `📅 Agendado para: ${scheduledAtLabel}\n` +
        `🔗 Link gerado em: ${requestCreatedAtLabel}\n` +
        `👨‍💻 Gerado por: ${createdByLabel}\n` +
        `⏱️ Respondido em: ${respondedAtLabel}` +
        `${requestLabelText ? `\n🏷️ Solicitação: ${requestLabelText}` : ''}` +
        `${feedbackText}` +
        `${context?.attachmentCount ? `\n📎 Anexos: ${context.attachmentCount}` : ''}` +
        `\n\nRevise o conteúdo e reenvie para aprovação.`;
    }

    const apiUrl = `${EVOLUTION_BASE_URL}/message/sendText/${waCfg.instance_name}`;
    const payload = { number: notifyNumber, text };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[WhatsApp] Evolution API erro:', res.status, errBody);
      return;
    }
    edgeDebugLog('[WhatsApp] Notificação (aprovação cliente) enviada para', notifyNumber);
  } catch (err) {
    console.error('[WhatsApp] Erro (non-fatal):', err);
  }
}

serve(async (req) => {
  const co = resolveCors(req, {
    allowHeaders: 'Content-Type, Authorization, apikey, x-client-info',
    allowMethods: 'POST, OPTIONS',
  });
  if (co instanceof Response) return co;
  const cors = co;

  const errorResponse = (message: string, status: number): Response =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return errorResponse('Método não permitido', 405);
  }

  const rl = rateLimitByKey(`submit-approval:${clientIp(req)}`, 40, 60_000);
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

  let body: { token?: string; postId?: string; action?: string; feedback?: string; attachmentUrls?: unknown };
  try {
    const rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse('Corpo inválido.', 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
  const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;
  const rawFeedback = typeof body.feedback === 'string' ? body.feedback : '';
  const trimmedFeedback = rawFeedback.trim();
  const feedback = trimmedFeedback.slice(0, MAX_FEEDBACK_LENGTH);

  let attachmentUrls: string[] = [];
  if (Array.isArray(body.attachmentUrls)) {
    attachmentUrls = body.attachmentUrls
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 2048)
      .slice(0, MAX_ATTACHMENT_URLS);
  }

  if (action === 'reject' && trimmedFeedback.length > MAX_FEEDBACK_LENGTH) {
    return errorResponse(`Feedback muito longo. Máximo ${MAX_FEEDBACK_LENGTH} caracteres.`, 400);
  }

  if (action === 'reject' && attachmentUrls.length > 0) {
    if (!supabaseUrl) {
      return errorResponse('Configuração inválida.', 500);
    }
    for (const u of attachmentUrls) {
      if (!isValidPublicAttachmentUrl(supabaseUrl, u)) {
        return errorResponse('URL de anexo inválida.', 400);
      }
    }
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

    const { data: requestRow, error: requestError } = await supabase
      .from('approval_requests')
      .select('id, created_at, created_by, label')
      .eq('token', token)
      .gt('expires_at', now)
      .single();

    if (requestError || !requestRow) {
      return errorResponse('Link inválido ou expirado.', 404);
    }

    const { data: junctionRow, error: junctionError } = await supabase
      .from('approval_request_posts')
      .select('id')
      .eq('approval_request_id', requestRow.id)
      .eq('scheduled_post_id', postId)
      .single();

    if (junctionError || !junctionRow) {
      return errorResponse('Post não encontrado nesta solicitação.', 404);
    }

    const { data: postRow, error: postError } = await supabase
      .from('scheduled_posts')
      .select('approval_status, post_type, posting_platform')
      .eq('id', postId)
      .single();

    if (postError || !postRow) {
      return errorResponse('Post não encontrado.', 404);
    }

    const currentStatus = postRow.approval_status as string | null;
    if (currentStatus && currentStatus !== 'pending') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Este post já foi respondido anteriormente.',
        }),
        {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'approve') {
      const keepAsApprovalOnly =
        postRow.post_type === 'roteiro' || postRow.posting_platform === 'linkedin';
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          approval_status: 'approved',
          for_approval_only: keepAsApprovalOnly ? true : false,
          approval_responded_at: now,
          approval_feedback: null,
          approval_feedback_attachments: [],
        })
        .eq('id', postId);

      if (updateError) {
        console.error('submit-approval-response approve update error:', updateError);
        return errorResponse('Erro ao registrar aprovação.', 500);
      }

      await sendWhatsAppNotification(supabase, postId, 'approve', undefined, {
        respondedAt: now,
        requestCreatedAt: requestRow.created_at,
        requestCreatedBy: requestRow.created_by,
        requestLabel: requestRow.label,
      });
    } else {
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          approval_status: 'rejected',
          approval_feedback: feedback || null,
          approval_feedback_attachments: attachmentUrls.length ? attachmentUrls : [],
          approval_responded_at: now,
        })
        .eq('id', postId);

      if (updateError) {
        console.error('submit-approval-response reject update error:', updateError);
        return errorResponse('Erro ao registrar solicitação de alteração.', 500);
      }

      await sendWhatsAppNotification(supabase, postId, 'reject', feedback, {
        respondedAt: now,
        requestCreatedAt: requestRow.created_at,
        requestCreatedBy: requestRow.created_by,
        requestLabel: requestRow.label,
        attachmentCount: attachmentUrls.length,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('submit-approval-response error:', err);
    return errorResponse('Erro ao processar resposta.', 500);
  }
});
