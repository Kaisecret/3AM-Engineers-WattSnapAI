/**
 * Sliding-window limiter kept in memory. On Vercel each server instance has its own copy,
 * so this is a best-effort guard against one visitor draining the shared Gemini quota.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now = Date.now()) {
    const recent = (hits.get(key) ?? []).filter(time => now - time < windowMs);
    if (recent.length >= limit) { hits.set(key, recent); return false; }
    recent.push(now);
    hits.delete(key); hits.set(key, recent);
    if (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
    return true;
  };
}
