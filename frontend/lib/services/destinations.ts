import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { INDIAN_TIER_CITIES } from '@/lib/data/destinations';

export interface DestinationCache {
  id?: string;
  name: string;
  type: 'CITY' | 'DESTINATION';
  tier?: 'TIER1' | 'TIER2' | 'TIER3' | 'FAMOUS';
  metadata?: any;
  cached_report?: any;
}

export async function getDestinationFromCache(name: string): Promise<DestinationCache | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('yatra_destination_cache')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error || !data) {
      // Check local data if DB fails or is empty
      const allCities = [
        ...INDIAN_TIER_CITIES.tier1.map(c => ({ name: c, tier: 'TIER1' })),
        ...INDIAN_TIER_CITIES.tier2.map(c => ({ name: c, tier: 'TIER2' })),
        ...INDIAN_TIER_CITIES.tier3.map(c => ({ name: c, tier: 'TIER3' }))
      ];

      const localCity = allCities.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (localCity) {
        return { name: localCity.name, type: 'CITY', tier: localCity.tier as any };
      }

      const famous = INDIAN_TIER_CITIES.famousDestinations.find(d => d.name.toLowerCase().includes(name.toLowerCase()));
      if (famous) {
        return { name: famous.name, type: 'DESTINATION', tier: 'FAMOUS', metadata: { city: famous.city } };
      }

      return null;
    }

    return data;
  } catch (err) {
    return null;
  }
}

export async function upsertCachedReport(name: string, report: any) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('yatra_destination_cache')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('yatra_destination_cache')
        .update({ cached_report: report, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('yatra_destination_cache')
        .insert({ 
          name, 
          type: 'CITY', 
          cached_report: report, 
          updated_at: new Date().toISOString() 
        });
    }
  } catch (err) {
    console.warn('[Cache Upsert] Failed for', name);
  }
}

/**
 * Seed Supabase with destination data
 * To be run once to populate the cache table
 */
export async function seedDestinationCache() {
  const dataToInsert = [
    ...INDIAN_TIER_CITIES.tier1.map(c => ({ name: c, type: 'CITY', tier: 'TIER1' })),
    ...INDIAN_TIER_CITIES.tier2.map(c => ({ name: c, type: 'CITY', tier: 'TIER2' })),
    ...INDIAN_TIER_CITIES.tier3.map(c => ({ name: c, type: 'CITY', tier: 'TIER3' })),
    ...INDIAN_TIER_CITIES.famousDestinations.map(d => ({ 
      name: d.name, 
      type: 'DESTINATION', 
      tier: 'FAMOUS',
      metadata: { city: d.city, original_type: d.type } 
    }))
  ];

  try {
    const { error } = await supabaseAdmin
      .from('yatra_destination_cache')
      .upsert(dataToInsert, { onConflict: 'name' });

    if (error) throw error;
    return { success: true, count: dataToInsert.length };
  } catch (err) {
    console.error('Seeding Error:', err);
    return { success: false, error: err };
  }
}
