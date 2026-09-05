interface RateLimitOptions {
  max: number;
  windowSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Rate limit en memoria (válido para una sola instancia).
 * Para producción multi-instancia migrar a tabla rate_limits o Upstash
 * (ver agents/backend.md). La firma async permite intercambiar la
 * implementación sin tocar los call sites.
 */
export async function rateLimit(
  key: string,
  { max, windowSec }: RateLimitOptions,
): Promise<boolean> {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= max;
}

/** Solo para tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
