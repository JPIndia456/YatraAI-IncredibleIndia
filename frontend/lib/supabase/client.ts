import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseKey)) {
  console.error(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — auth and data calls will fail.",
  );
}

/**
 * Browser-side Supabase client for Next.js Client Components.
 */
export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

// Export a singleton for easier use in hooks and contexts
export const supabase = createClient();

