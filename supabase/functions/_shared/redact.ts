/** Remove valores sensíveis de objetos antes de log ou resposta ao cliente. */
const SENSITIVE_KEYS = new Set([
  'access_token',
  'refresh_token',
  'client_secret',
  'code',
  'fb_exchange_token',
]);

export function redactOAuthLike(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactOAuthLike);
  const o = { ...(obj as Record<string, unknown>) };
  for (const k of Object.keys(o)) {
    if (SENSITIVE_KEYS.has(k) && typeof o[k] === 'string') {
      o[k] = '[REDACTED]';
    } else if (typeof o[k] === 'object' && o[k] !== null) {
      o[k] = redactOAuthLike(o[k]) as unknown;
    }
  }
  return o;
}

export function edgeFuncsDebug(): boolean {
  return Deno.env.get('EDGE_FUNCS_DEBUG') === 'true';
}

export function edgeDebugLog(...args: unknown[]): void {
  if (edgeFuncsDebug()) console.log(...args);
}
