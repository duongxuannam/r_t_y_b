import type { Context, Next } from 'hono';
import type { AppState } from '../config/state';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export const rateLimit = (state: AppState) => async (c: Context, next: Next) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || c.env?.remoteAddress || 'unknown';
  const key = ip || 'unknown';
  const now = Date.now();
  const perSecond = state.rateLimitPerSecond;
  const burst = state.rateLimitBurst;
  const refillRate = perSecond / 1000;

  const bucket = buckets.get(key) ?? { tokens: burst, lastRefill: now };
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    bucket.tokens = Math.min(burst, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    return c.json({ message: 'rate limit exceeded' }, 429);
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  await next();
};
