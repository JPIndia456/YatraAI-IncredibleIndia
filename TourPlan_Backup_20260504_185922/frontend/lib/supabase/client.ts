import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

