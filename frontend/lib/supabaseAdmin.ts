import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase Client
 *
 * Strategy:
 *  - getServerClient(jwt) always uses anon+JWT (RLS applies)
 *  - getAdminClient() is explicit and bypasses RLS. Use only in trusted jobs/routes.
 *
 * NEVER expose the admin client to the browser.
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

/** True only when a real service role key is configured */
export const hasServiceKey =
  supabaseServiceKey.length > 20 && !supabaseServiceKey.startsWith('REPLACE_');

/** Admin client — bypasses all RLS. Use only in trusted server contexts. */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  hasServiceKey ? supabaseServiceKey : 'MISSING_SERVICE_ROLE_KEY',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Get a server-side Supabase client authenticated by the user's JWT.
 *
 * Always returns an anon client with Authorization header → RLS enforced.
 */
export function getServerClient(userJwt?: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: userJwt ? { headers: { Authorization: `Bearer ${userJwt}` } } : {},
  });
}

/** Explicit admin client accessor for trusted server-only flows. */
export function getAdminClient() {
  if (!hasServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return supabaseAdmin;
}

/** Extract Bearer token from an Authorization header string */
export function extractJwt(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
