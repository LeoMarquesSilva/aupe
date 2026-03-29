// Public upload for client approval feedback attachments (validates token + post in active request).
// POST JSON: { token, postId, fileBase64, fileName, mimeType }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { resolveCors } from '../_shared/cors.ts';
import { clientIp, rateLimitByKey } from '../_shared/rateLimit.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;
const VALID_TOKEN_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_BYTES = 4 * 1024 * 1024;
const BUCKET = 'approval-feedback';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function safeFileBase(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return base || 'file';
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

  const rl = rateLimitByKey(`upload-approval:${clientIp(req)}`, 30, 60_000);
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

  let body: {
    token?: string;
    postId?: string;
    fileBase64?: string;
    fileName?: string;
    mimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Corpo inválido.', 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
  const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName : 'upload';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';

  if (
    !token ||
    token.length < MIN_TOKEN_LENGTH ||
    token.length > MAX_TOKEN_LENGTH ||
    !VALID_TOKEN_REGEX.test(token)
  ) {
    return errorResponse('Link inválido ou expirado.', 404);
  }
  if (!postId || !fileBase64) {
    return errorResponse('postId e fileBase64 são obrigatórios.', 400);
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return errorResponse('Tipo de arquivo não permitido.', 400);
  }

  let binary: Uint8Array;
  try {
    const raw = fileBase64.includes(',') ? fileBase64.split(',').pop() ?? '' : fileBase64;
    binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    return errorResponse('Arquivo inválido (base64).', 400);
  }
  if (binary.length === 0 || binary.length > MAX_BYTES) {
    return errorResponse(`Arquivo muito grande. Máximo ${MAX_BYTES / 1024 / 1024} MB.`, 400);
  }

  try {
    const now = new Date().toISOString();
    const { data: requestRow, error: requestError } = await supabase
      .from('approval_requests')
      .select('id')
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
      .maybeSingle();

    if (junctionError || !junctionRow) {
      return errorResponse('Post não encontrado nesta solicitação.', 404);
    }

    const { data: postRow, error: postError } = await supabase
      .from('scheduled_posts')
      .select('approval_status')
      .eq('id', postId)
      .single();

    if (postError || !postRow || (postRow.approval_status && postRow.approval_status !== 'pending')) {
      return errorResponse('Não é possível anexar após resposta deste post.', 400);
    }

    const objectPath = `${postId}/${crypto.randomUUID()}-${safeFileBase(fileName)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, binary, {
      contentType: mimeType,
      upsert: false,
    });

    if (upErr) {
      console.error('upload approval attachment:', upErr);
      return errorResponse('Falha ao enviar arquivo.', 500);
    }

    const pub = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${objectPath}`;

    return new Response(JSON.stringify({ url: pub }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('upload-approval-feedback-attachment:', err);
    return errorResponse('Erro ao processar upload.', 500);
  }
});
