/**
 * TourPlan Search Cache Service
 * Caches live train/flight/bus/hotel/taxi results in Supabase.
 * Cache TTL: 6 hours (prices expire quickly, but reduces Gemini API calls).
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type SearchMode = 'trains' | 'flights' | 'buses' | 'hotels' | 'taxis';

function buildCacheKey(mode: SearchMode, params: Record<string, string | undefined>): string {
  const { origin, destination, date, location } = params;
  const dest = destination || location || '';
  const parts = [mode, (origin || '').toLowerCase(), dest.toLowerCase(), date || ''].filter(Boolean);
  return parts.join('::');
}

/**
 * Check if a valid (non-expired) cache entry exists.
 * Returns the cached results array, or null on miss.
 */
export async function getSearchCache(
  mode: SearchMode,
  params: Record<string, string | undefined>
): Promise<any[] | null> {
  try {
    const cacheKey = buildCacheKey(mode, params);
    const { data, error } = await supabaseAdmin
      .from('tourplan_search_cache')
      .select('results, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    const results = data.results as any[];
    if (!Array.isArray(results) || results.length === 0) return null;

    console.log(`[SearchCache] HIT for ${cacheKey} (${results.length} items)`);
    return results;
  } catch (e) {
    console.warn('[SearchCache] Read error:', e);
    return null;
  }
}

/**
 * Persist search results to Supabase with 6h expiry.
 * Uses upsert on cache_key to overwrite stale data.
 */
export async function setSearchCache(
  mode: SearchMode,
  params: Record<string, string | undefined>,
  results: any[],
  source: string = 'gemini-search'
): Promise<void> {
  try {
    const cacheKey = buildCacheKey(mode, params);
    const { origin, destination, date, location } = params;
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // +6 hours

    const { error } = await supabaseAdmin
      .from('tourplan_search_cache')
      .upsert(
        {
          cache_key: cacheKey,
          mode,
          origin: origin || null,
          destination: destination || location || '',
          travel_date: date || null,
          results: results as any,
          result_count: results.length,
          source,
          expires_at: expiresAt,
        },
        { onConflict: 'cache_key' }
      );

    if (error) {
      console.warn(`[SearchCache] Write error for ${cacheKey}:`, error.message);
    } else {
      console.log(`[SearchCache] SAVED ${results.length} ${mode} results → ${cacheKey} (expires ${expiresAt})`);
    }
  } catch (e) {
    console.warn('[SearchCache] Write exception:', e);
  }
}

/**
 * Delete expired cache entries (housekeeping).
 * Call this periodically from a maintenance route.
 */
export async function pruneExpiredCache(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tourplan_search_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    if (error) throw error;
    const count = data?.length ?? 0;
    console.log(`[SearchCache] Pruned ${count} expired entries`);
    return count;
  } catch (e) {
    console.warn('[SearchCache] Prune error:', e);
    return 0;
  }
}
