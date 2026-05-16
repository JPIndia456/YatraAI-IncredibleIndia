import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side Supabase client for Next.js Server Components and Routes.
 * Handles automatic cookie management for auth sessions.
 * 
 * In Next.js 15, cookies() is async, so this should be called with:
 * const cookieStore = await cookies();
 * const supabase = createClient(cookieStore);
 */
export const createClient = (cookieStore: any) => {
  const url = supabaseUrl?.trim();
  const key = supabaseKey?.trim();
  if (!url || !key) {
    throw new Error(
      "[Supabase] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for server routes.",
    );
  }
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

