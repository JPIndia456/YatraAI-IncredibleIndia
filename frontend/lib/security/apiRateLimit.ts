/**
 * Lightweight in-memory rate limiter for public API routes.
 *
 * This is an additive abuse guard for unauthenticated cost-sensitive
 * endpoints (AI generation, external API relays). It is intentionally generous
 * so it does not affect normal interactive usage, and only blocks bursty abuse
 * from a single client.
 *
 * Note: state is per-server-instance (resets on cold start and is not shared
 * across serverless lambdas). For hard guarantees use the persistent
 * `auth_rate_limits` table. This is a cheap first line of defense.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

/** Extract a best-effort client IP from common proxy headers. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Fixed-window limiter. Returns `{ ok: false }` once `max` requests have been
 * made within `windowMs` for the given `key`.
 */
export function consumeRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup to keep the map bounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets.entries()) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (existing.count >= max) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

/**
 * Convenience guard: rate-limit a request by IP under a named scope.
 * Returns a ready-to-send 429 `Response` when the limit is exceeded, otherwise null.
 */
export function rateLimitOr429(
  req: Request,
  scope: string,
  max: number,
  windowMs: number,
): Response | null {
  const result = consumeRateLimit(`${scope}:${getClientIp(req)}`, max, windowMs);
  if (result.ok) return null;
  const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ success: false, error: 'Too many requests. Please slow down and try again shortly.', retryAfterSeconds }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}
