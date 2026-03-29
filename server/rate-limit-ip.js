/**
 * Rate limit por chave (ex.: IP) em memória. Em serverless cada instância tem seu próprio mapa.
 * @param {string} key
 * @param {number} max
 * @param {number} windowMs
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
const buckets = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

function clientIpFromReq(req) {
  const xff = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']);
  if (xff && typeof xff === 'string') {
    return xff.split(',')[0].trim();
  }
  if (req.socket && req.socket.remoteAddress) {
    return String(req.socket.remoteAddress);
  }
  return 'unknown';
}

module.exports = { rateLimit, clientIpFromReq };
