/** Cópia local para bundle da função (mantenha alinhado com supabase/functions/_shared/cors.ts). */
export function parseAllowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

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

  if (list.includes(origin) || isLoopbackOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': allowHeaders,
      'Access-Control-Allow-Methods': allowMethods,
    };
  }

  return null;
}

export type CorsOpts = { allowHeaders?: string; allowMethods?: string };

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
