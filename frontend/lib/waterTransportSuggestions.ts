/** Curated crossing options where rail is absent or impractical. Not a live timetable — prices indicative. */

export type WaterCrossingOption = {
  id: string;
  name: string;
  operator?: string;
  mode: 'ferry' | 'roro';
  departure: string;
  arrival: string;
  duration: string;
  price: string;
  availability?: string;
  note?: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MUMBAI_KEYS = ['mumbai', 'bombay', 'gateway of india', 'colaba'];
const RAIGAD_KEYS = ['alibaug', 'alibag', 'mandwa', 'kihim', 'nagaon'];
const KOCHI_KEYS = ['kochi', 'cochin', 'fort kochi', 'willingdon island', 'vypin', 'cherai'];
const ANDAMAN_KEYS = ['port blair', 'havelock', 'swaraj dweep', 'neil island', 'shaheed dweep'];
const GOA_KEYS = ['panaji', 'panjim', 'dona paula', 'vasco', 'mormugao'];

function mentionsAny(normStr: string, keys: readonly string[]): boolean {
  return keys.some((k) => normStr.includes(k));
}

/** Returns passenger ferry + Ro-Ro options when route is Mumbai metro ↔ Raigad coast (e.g. Alibaug). */
export function getWaterCrossingSuggestions(from: string, to: string): WaterCrossingOption[] {
  const a = norm(from);
  const b = norm(to);
  if (!a || !b) return [];

  const results: WaterCrossingOption[] = [];

  // Mumbai - Alibaug
  if ((mentionsAny(a, MUMBAI_KEYS) && mentionsAny(b, RAIGAD_KEYS)) || (mentionsAny(b, MUMBAI_KEYS) && mentionsAny(a, RAIGAD_KEYS))) {
    results.push({
      id: 'mumbai-mandwa-passenger-ferry',
      name: 'Passenger ferry · Gateway of India ↔ Mandwa',
      operator: 'M2M Ferries / PNP / Maldar',
      mode: 'ferry',
      departure: 'Gateway of India',
      arrival: 'Mandwa Jetty (then bus to Alibaug)',
      duration: '50 min',
      price: '₹250 - ₹450',
      note: 'Most scenic and fastest way to reach Alibaug from South Mumbai.'
    });
    results.push({
      id: 'mumbai-mandwa-roro',
      name: 'M2M Ro-Ro Ferry · Ferry Wharf ↔ Mandwa',
      operator: 'M2M Ferries',
      mode: 'roro',
      departure: 'Bhaucha Dhakka (Ferry Wharf)',
      arrival: 'Mandwa Jetty',
      duration: '60 min',
      price: '₹400 (Person) / ₹1200+ (Car)',
      note: 'Carry your vehicle across the sea. All-weather service.'
    });
  }

  // Kochi - Fort Kochi
  if (mentionsAny(a, KOCHI_KEYS) && mentionsAny(b, KOCHI_KEYS)) {
    results.push({
      id: 'kochi-water-metro',
      name: 'Kochi Water Metro',
      operator: 'KMRL',
      mode: 'ferry',
      departure: 'Vyttila / High Court',
      arrival: 'Fort Kochi / Vypin',
      duration: '20 min',
      price: '₹20 - ₹40',
      note: 'World-class air-conditioned electric ferries. Highly recommended for sightseeing.'
    });
  }

  // Andaman Islands
  if (mentionsAny(a, ANDAMAN_KEYS) && mentionsAny(b, ANDAMAN_KEYS)) {
    results.push({
      id: 'andaman-private-ferry',
      name: 'Private Luxury Ferry (Nautika / Makruzz)',
      operator: 'Makruzz / Nautika',
      mode: 'ferry',
      departure: 'Port Blair',
      arrival: 'Havelock (Swaraj Dweep)',
      duration: '90 min',
      price: '₹1200 - ₹2500',
      note: 'The primary way to travel between islands in Andamans.'
    });
  }

  // Goa
  if (mentionsAny(a, GOA_KEYS) && mentionsAny(b, GOA_KEYS)) {
    results.push({
      id: 'goa-river-ferry',
      name: 'Goa River Ferry',
      operator: 'River Navigation Dept',
      mode: 'ferry',
      departure: 'Panjim',
      arrival: 'Betim / Divar Island',
      duration: '10 min',
      price: 'Free (Pedestrians) / ₹10 (Vehicles)',
      note: 'A classic Goan experience. Very frequent and convenient.'
    });
  }

  return results;
}
