import { supabase, postService } from './supabaseClient';
import type { ApprovalRequest, ScheduledPost, ApprovalStatus } from '../types';
import { isApprovalStatus } from '../types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
/** In dev, use relative path so CRA proxy avoids CORS. In prod, use full Supabase URL. */
const functionsBase = process.env.NODE_ENV === 'development' ? '' : supabaseUrl;
const APPROVAL_EXPIRY_OPTIONS = new Set([7, 15, 30]);

/** Payload for saving content created on the Approval page (for approval only, not for posting). */
export interface SaveContentForApprovalPayload {
  postType: 'post' | 'carousel' | 'reels' | 'stories' | 'roteiro';
  caption: string;
  images?: string[];
  video?: string;
  coverImage?: string;
  scheduledDate?: string;
}

/**
 * Saves content for the approval flow only. Does NOT trigger N8N/posting.
 * Caller must upload media first and pass URLs in payload.
 */
export async function saveContentForApproval(
  clientId: string,
  payload: SaveContentForApprovalPayload
): Promise<ScheduledPost> {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(10, 0, 0, 0);
  const scheduledDate = payload.scheduledDate ?? defaultDate.toISOString();

  const isRoteiro = payload.postType === 'roteiro';

  const saved = await postService.saveScheduledPost({
    clientId,
    caption: payload.caption || '',
    images: isRoteiro ? [] : (payload.images && payload.images.length > 0 ? payload.images : []),
    scheduledDate,
    postType: isRoteiro ? 'roteiro' : payload.postType,
    status: 'pending',
    forApprovalOnly: true,
    video: isRoteiro ? undefined : payload.video,
    coverImage: isRoteiro ? undefined : payload.coverImage,
  });
  return saved as ScheduledPost;
}

export interface ApprovalRequestWithPosts extends ApprovalRequest {
  posts: { scheduledPostId: string; sortOrder: number; approvalStatus?: ApprovalStatus; approvalFeedback?: string | null }[];
}

export interface CreateApprovalRequestResult {
  id: string;
  token: string;
  expiresAt: string;
  url: string;
  label: string | null;
}

function generateToken(): string {
  const part1 = crypto.randomUUID().replace(/-/g, '');
  const part2 = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return part1 + part2;
}

/**
 * Returns the public URL for the client approval page
 */
export function getApprovalRequestUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/approve/${encodeURIComponent(token)}`;
}

async function createApprovalRequestLegacy(
  clientId: string,
  postIds: string[],
  expiresInDays: number,
  label?: string,
  token?: string
): Promise<CreateApprovalRequestResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const finalToken = token || generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data: requestRow, error: requestError } = await supabase
    .from('approval_requests')
    .insert({
      client_id: clientId,
      token: finalToken,
      expires_at: expiresAt.toISOString(),
      label: label || null,
      created_by: user.id,
    })
    .select('id, token, expires_at, label')
    .single();

  if (requestError) throw requestError;
  if (!requestRow) throw new Error('Falha ao criar solicitação de aprovação.');

  const approvalRequestId = requestRow.id;
  const inserts = postIds.map((scheduledPostId, index) => ({
    approval_request_id: approvalRequestId,
    scheduled_post_id: scheduledPostId,
    sort_order: index,
  }));

  const { error: junctionError } = await supabase
    .from('approval_request_posts')
    .insert(inserts);
  if (junctionError) throw junctionError;

  const { error: updateError } = await supabase
    .from('scheduled_posts')
    .update({
      requires_approval: true,
      approval_status: 'pending',
      approval_feedback: null,
      approval_responded_at: null,
    })
    .in('id', postIds);
  if (updateError) throw updateError;

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    id: requestRow.id,
    token: requestRow.token,
    expiresAt: requestRow.expires_at,
    url: `${base}/approve/${encodeURIComponent(requestRow.token)}`,
    label: requestRow.label,
  };
}

/**
 * Creates an approval request: inserts approval_requests, approval_request_posts,
 * and sets requires_approval=true, approval_status='pending' on each scheduled post.
 */
export async function createApprovalRequest(
  clientId: string,
  postIds: string[],
  expiresInDays: number = 7,
  label?: string
): Promise<CreateApprovalRequestResult> {
  if (!clientId) {
    throw new Error('Selecione um cliente para criar a solicitação.');
  }
  if (!APPROVAL_EXPIRY_OPTIONS.has(expiresInDays)) {
    throw new Error('Validade inválida. Use 7, 15 ou 30 dias.');
  }
  const normalizedPostIds = [...new Set(postIds.filter(Boolean))];
  if (normalizedPostIds.length === 0) {
    throw new Error('Selecione ao menos um post para criar a solicitação.');
  }

  const token = generateToken();
  const { data: rpcRows, error: rpcError } = await supabase.rpc('create_approval_request_atomic', {
    p_client_id: clientId,
    p_post_ids: normalizedPostIds,
    p_expires_in_days: expiresInDays,
    p_label: label || null,
    p_token: token,
  });

  if (rpcError) {
    const message = rpcError.message || 'Falha ao criar solicitação de aprovação.';
    const rpcNotAvailable =
      message.includes('create_approval_request_atomic') ||
      message.includes('schema cache') ||
      message.includes('Could not find the function');
    if (rpcNotAvailable) {
      // Backward compatibility: environments without the new migration keep working.
      return createApprovalRequestLegacy(clientId, normalizedPostIds, expiresInDays, label, token);
    }
    if (message.includes('já está vinculado')) {
      throw new Error('Um ou mais posts já estão em um link ativo. Atualize a lista e tente novamente.');
    }
    throw new Error(message);
  }
  const requestRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!requestRow?.id || !requestRow?.token || !requestRow?.expires_at) {
    throw new Error('Falha ao criar solicitação de aprovação.');
  }

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    id: requestRow.id,
    token: requestRow.token,
    expiresAt: requestRow.expires_at,
    url: `${base}/approve/${encodeURIComponent(requestRow.token)}`,
    label: requestRow.label ?? null,
  };
}

/**
 * Returns post IDs that are already in active (non-expired) approval links for a client.
 */
export async function getPostIdsInActiveLinks(clientId: string): Promise<Set<string>> {
  const requests = await listApprovalRequests(clientId);
  const ids = new Set<string>();
  for (const r of requests) {
    for (const p of r.posts) {
      ids.add(p.scheduledPostId);
    }
  }
  return ids;
}

/**
 * Lists approval requests for a client (with post count / status summary if needed).
 */
export async function listApprovalRequests(clientId: string): Promise<ApprovalRequestWithPosts[]> {
  const now = new Date().toISOString();

  const { data: requests, error: reqError } = await supabase
    .from('approval_requests')
    .select('id, client_id, token, expires_at, label, created_at, created_by')
    .eq('client_id', clientId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (reqError) throw reqError;
  if (!requests?.length) return [];

  const requestIds = requests.map((r) => r.id);
  const { data: junctionRows, error: junctionError } = await supabase
    .from('approval_request_posts')
    .select('approval_request_id, scheduled_post_id, sort_order')
    .in('approval_request_id', requestIds);

  if (junctionError) throw junctionError;

  const postIds = [...new Set((junctionRows ?? []).map((r) => r.scheduled_post_id))];
  if (postIds.length === 0) {
    return requests.map((r) => ({
      id: r.id,
      clientId: r.client_id,
      token: r.token,
      expiresAt: r.expires_at,
      label: r.label,
      createdAt: r.created_at,
      createdBy: r.created_by,
      posts: [],
    }));
  }

  const { data: postsRows, error: postsError } = await supabase
    .from('scheduled_posts')
    .select('id, approval_status, approval_feedback')
    .in('id', postIds);

  if (postsError) throw postsError;
  const postStatusMap = new Map(
    (postsRows ?? []).map((p) => [
      p.id,
      {
        approvalStatus: isApprovalStatus(p.approval_status) ? p.approval_status : undefined,
        approvalFeedback: p.approval_feedback,
      },
    ])
  );

  const postsByRequest = new Map<string, { scheduledPostId: string; sortOrder: number; approvalStatus?: ApprovalStatus; approvalFeedback?: string | null }[]>();
  for (const j of junctionRows ?? []) {
    const arr = postsByRequest.get(j.approval_request_id) ?? [];
    const info = postStatusMap.get(j.scheduled_post_id);
    arr.push({
      scheduledPostId: j.scheduled_post_id,
      sortOrder: j.sort_order,
      approvalStatus: info?.approvalStatus ?? undefined,
      approvalFeedback: info?.approvalFeedback ?? undefined,
    });
    postsByRequest.set(j.approval_request_id, arr);
  }
  for (const arr of postsByRequest.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return requests.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    token: r.token,
    expiresAt: r.expires_at,
    label: r.label,
    createdAt: r.created_at,
    createdBy: r.created_by,
    posts: postsByRequest.get(r.id) ?? [],
  }));
}

export interface ActiveApprovalLinkWithClient {
  id: string;
  clientId: string;
  clientName: string;
  clientInstagram: string | null;
  clientPhotoUrl: string | null;
  token: string;
  url: string;
  expiresAt: string;
  label: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByLabel: string;
}

/**
 * Lista todos os links de aprovação ativos (para a página de links compartilhados).
 */
export async function listAllActiveApprovalLinks(): Promise<ActiveApprovalLinkWithClient[]> {
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('approval_requests')
    .select('id, client_id, token, expires_at, label, created_at, created_by, clients(name, instagram, profile_picture, logo_url)')
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const typedRows = (rows || []) as Array<{
    id: string;
    client_id: string;
    token: string;
    expires_at: string;
    label: string | null;
    created_at: string;
    created_by: string | null;
    clients:
      | { name: string; instagram: string | null; profile_picture: string | null; logo_url: string | null }
      | { name: string; instagram: string | null; profile_picture: string | null; logo_url: string | null }[]
      | null;
  }>;

  const creatorIds = [...new Set(typedRows.map((r) => r.created_by).filter(Boolean))] as string[];
  let creatorMap: Record<string, { full_name: string | null; email: string }> = {};
  if (creatorIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds);
    if (profilesData) {
      creatorMap = profilesData.reduce(
        (acc, p) => {
          acc[p.id] = { full_name: p.full_name ?? null, email: p.email ?? '' };
          return acc;
        },
        {} as Record<string, { full_name: string | null; email: string }>
      );
    }
  }

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return typedRows.map((row) => {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const creator = row.created_by ? creatorMap[row.created_by] : null;
    const createdByLabel = creator ? (creator.full_name || creator.email || 'Usuário') : '—';
    const clientPhotoUrl = client?.profile_picture || client?.logo_url || null;
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name ?? 'Cliente',
      clientInstagram: client?.instagram ?? null,
      clientPhotoUrl: clientPhotoUrl ?? null,
      token: row.token,
      url: `${base}/approve/${encodeURIComponent(row.token)}`,
      expiresAt: row.expires_at,
      label: row.label,
      createdAt: row.created_at,
      createdBy: row.created_by,
      createdByLabel,
    };
  });
}

/** Response shape from get-approval-request-by-token (public approval page) */
export interface ApprovalRequestPublicData {
  client: { id: string; name: string; instagram: string; logoUrl?: string; profilePicture?: string };
  posts: {
    id: string;
    caption: string;
    images: (string | { url: string })[];
    video?: string;
    coverImage?: string;
    postType: string;
    scheduledDate: string;
    approvalStatus: ApprovalStatus;
    approvalFeedback?: string;
    approvalRespondedAt?: string;
  }[];
  expiresAt: string;
}

/**
 * Fetches approval request data for the public client page (calls Edge Function).
 */
export async function fetchApprovalRequestByToken(token: string): Promise<ApprovalRequestPublicData> {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('REACT_APP_SUPABASE_URL não está configurada.');
  }
  const url = `${functionsBase}/functions/v1/get-approval-request-by-token?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: 'GET' });
  let body: { error?: string } = {};
  try {
    body = await res.json();
  } catch {
    body = { error: res.status === 404 ? 'Link inválido ou expirado.' : 'Erro ao carregar dados.' };
  }
  if (!res.ok) {
    throw new Error(body?.error || 'Link inválido ou expirado.');
  }
  return body as ApprovalRequestPublicData;
}

/** Response from submit-approval-response Edge Function */
export interface SubmitApprovalResponseResult {
  success: boolean;
  message?: string;
}

const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Submits client approval or rejection (calls Edge Function).
 * Returns result with optional message (e.g. "Este post já foi respondido anteriormente").
 */
export async function submitApprovalResponse(
  token: string,
  postId: string,
  action: 'approve' | 'reject',
  feedback?: string
): Promise<SubmitApprovalResponseResult> {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('REACT_APP_SUPABASE_URL não está configurada.');
  }
  const trimmedFeedback = (feedback ?? '').trim();
  if (action === 'reject' && trimmedFeedback.length > MAX_FEEDBACK_LENGTH) {
    throw new Error(`Feedback muito longo. Máximo ${MAX_FEEDBACK_LENGTH} caracteres.`);
  }
  const url = `${functionsBase}/functions/v1/submit-approval-response`;
  const res = await fetch(url, {
    method: 'POST',
    // Intentionally omit custom headers to avoid browser preflight instability on some networks.
    // The edge function accepts and parses JSON payload regardless of content-type.
    body: JSON.stringify({ token, postId, action, feedback: trimmedFeedback }),
  });
  let body: { error?: string; success?: boolean; message?: string } = {};
  try {
    body = await res.json();
  } catch {
    body = { error: 'Erro ao enviar resposta.' };
  }
  if (!res.ok) {
    throw new Error(body?.error || 'Erro ao enviar resposta.');
  }
  return { success: body.success ?? true, message: body.message };
}

/**
 * Remove um post do fluxo de aprovação (sai de "aguardando") e desvincula de qualquer link.
 * O post continua existindo; deixa de exigir aprovação.
 */
export async function removePostFromApproval(postId: string): Promise<void> {
  const { error: junctionError } = await supabase
    .from('approval_request_posts')
    .delete()
    .eq('scheduled_post_id', postId);

  if (junctionError) throw junctionError;

  const { error: updateError } = await supabase
    .from('scheduled_posts')
    .update({
      requires_approval: false,
      for_approval_only: false,
      approval_status: null,
      approval_feedback: null,
      approval_responded_at: null,
    })
    .eq('id', postId);

  if (updateError) throw updateError;
}

/**
 * Exclui um link de aprovação e remove os posts desse link do fluxo de aprovação.
 * Os posts não são deletados; apenas deixam de estar vinculados ao link e de exigir aprovação.
 */
export async function deleteApprovalLink(linkId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data: junctionRows, error: fetchError } = await supabase
    .from('approval_request_posts')
    .select('scheduled_post_id')
    .eq('approval_request_id', linkId);

  if (fetchError) throw fetchError;
  const postIds = (junctionRows ?? []).map((r) => r.scheduled_post_id);

  const { error: junctionDeleteError } = await supabase
    .from('approval_request_posts')
    .delete()
    .eq('approval_request_id', linkId);

  if (junctionDeleteError) throw junctionDeleteError;

  const { error: requestDeleteError } = await supabase
    .from('approval_requests')
    .delete()
    .eq('id', linkId);

  if (requestDeleteError) throw requestDeleteError;

  if (postIds.length > 0) {
    const { data: stillLinkedRows, error: stillLinkedError } = await supabase
      .from('approval_request_posts')
      .select('scheduled_post_id, approval_requests!inner(expires_at)')
      .in('scheduled_post_id', postIds)
      .gt('approval_requests.expires_at', now);

    if (stillLinkedError) throw stillLinkedError;
    const stillLinkedPostIds = new Set((stillLinkedRows ?? []).map((r: any) => r.scheduled_post_id));
    const releasablePostIds = postIds.filter((id) => !stillLinkedPostIds.has(id));

    if (releasablePostIds.length === 0) return;

    const { error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        requires_approval: false,
        for_approval_only: false,
        approval_status: null,
        approval_feedback: null,
        approval_responded_at: null,
      })
      .in('id', releasablePostIds);

    if (updateError) throw updateError;
  }
}
