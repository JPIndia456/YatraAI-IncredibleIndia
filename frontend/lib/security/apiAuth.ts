import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServerClient, extractJwt } from '@/lib/supabaseAdmin';
import type { User } from '@supabase/supabase-js';

/**
 * Unified server-side request authentication for API route handlers.
 *
 * Supports two legitimate caller shapes used across the app:
 *  1. Browser, same-origin fetch → Supabase session cookies.
 *  2. Native / token clients → `Authorization: Bearer <jwt>`.
 *
 * Plus a trusted server-to-server path via a shared `INTERNAL_API_SECRET`
 * header for internal fan-out calls (never exposed to the browser).
 */

const INTERNAL_SECRET = (process.env.INTERNAL_API_SECRET ?? '').trim();

export type AuthContext = { user: User | null; internal: boolean };

/** True when the request carries a valid internal service secret. */
export function isInternalRequest(req: Request): boolean {
  if (!INTERNAL_SECRET) return false;
  const provided = req.headers.get('x-internal-secret');
  return Boolean(provided) && provided === INTERNAL_SECRET;
}

/** Header bag for internal server-to-server calls. Empty when no secret is set. */
export function internalHeaders(): Record<string, string> {
  return INTERNAL_SECRET ? { 'x-internal-secret': INTERNAL_SECRET } : {};
}

/**
 * Resolve the authenticated user from a Bearer token first, then session
 * cookies. Returns null when neither yields a valid user.
 */
export async function getRequestUser(req: Request): Promise<User | null> {
  const jwt = extractJwt(req.headers.get('Authorization'));
  if (jwt) {
    try {
      const { data, error } = await getServerClient(jwt).auth.getUser(jwt);
      if (!error && data?.user) return data.user;
    } catch {
      // fall through to cookie-based auth
    }
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) return data.user;
  } catch {
    // no usable session
  }

  return null;
}

const unauthorized = () =>
  NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

/**
 * Require a signed-in user. Returns the user on success or a ready-to-return
 * 401 `NextResponse`. Callers should `if (res instanceof NextResponse) return res;`.
 */
export async function requireUser(req: Request): Promise<{ user: User } | NextResponse> {
  const user = await getRequestUser(req);
  if (!user) return unauthorized();
  return { user };
}

/**
 * Require either a signed-in user or a trusted internal call. Suitable for
 * routes invoked both by the browser and by server-side fan-out.
 */
export async function requireUserOrInternal(
  req: Request,
): Promise<AuthContext | NextResponse> {
  if (isInternalRequest(req)) return { user: null, internal: true };
  const user = await getRequestUser(req);
  if (!user) return unauthorized();
  return { user, internal: false };
}
