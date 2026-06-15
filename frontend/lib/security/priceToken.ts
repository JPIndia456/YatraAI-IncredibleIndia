import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs a price-verification payload so the client cannot tamper with the
 * amount before checkout. The token format is `<base64url(payload)>.<hex hmac>`.
 *
 * The signing key prefers a dedicated PRICE_TOKEN_SECRET and falls back to the
 * service-role key (always server-side). If neither exists we cannot sign and
 * callers must treat the token as untrusted.
 */

export type PriceTokenPayload = {
  livePrice: number;
  ts: number;
  origin?: string;
  destination?: string;
};

function getSigningKey(): string | null {
  const key =
    process.env.PRICE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    '';
  return key.length >= 16 ? key : null;
}

function sign(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

/** Returns a signed token, or null if no signing key is configured. */
export function signPriceToken(payload: PriceTokenPayload): string | null {
  const key = getSigningKey();
  if (!key) return null;
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = sign(body, key);
  return `${body}.${sig}`;
}

/** Verifies a signed token and returns its payload, or null when invalid. */
export function verifyPriceToken(token: string): PriceTokenPayload | null {
  const key = getSigningKey();
  if (!key || typeof token !== 'string' || !token.includes('.')) return null;

  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body, key);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PriceTokenPayload;
  } catch {
    return null;
  }
}
