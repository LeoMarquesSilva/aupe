/** Lista de origens permitidas (vírgula). Vazio = compat: Access-Control-Allow-Origin: * */
export function parseAllowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * CORS para chamadas do browser. Sem Origin (cron, curl, webhooks): *.
 * Com ALLOWED_ORIGINS definido: só ecoa Origin se estiver na lista; caso contrário retorna null (bloquear).
 */
export function corsForRequest(
  req: Request,
  opts?: { allowHeaders?: string; allowMethods?: string },
): Record<string, string> | null {
  const list = parseAllowedOrigins();
  const origin = req.headers.get('Origin');
  const allowHeaders =
    opts?.allowHeaders ??
    'authorization, x-client-info, apikey, content-type, x-cron-secret';
  const allowMethods = opts?.allowMethods ?? 'GET, POST, OPTIONS';

  if (list.length === 0) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': allowHeaders,
      'Access-Control-Allow-Methods': allowMethods,
    };
  }

  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': allowHeaders,
      'Access-Control-Allow-Methods': allowMethods,
    };
  }

  if (!list.includes(origin)) {
    return null;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': allowMethods,
  };
}

export type CorsOpts = { allowHeaders?: string; allowMethods?: string };

/** Se a origem não for permitida, retorna Response 403 (defina ALLOWED_ORIGINS no Supabase em produção). */
export function resolveCors(req: Request, opts?: CorsOpts): Record<string, string> | Response {
  const c = corsForRequest(req, opts);
  if (c === null) {
    return new Response(JSON.stringify({ error: 'Origin não permitida' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return c;
}
