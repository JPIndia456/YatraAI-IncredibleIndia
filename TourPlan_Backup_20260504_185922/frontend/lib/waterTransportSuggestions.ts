/** Curated crossing options where rail is absent or impractical (e.g. Mumbai ↔ Raigad coast). Not a live timetable — prices indicative. */

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

const MUMBAI_METRO_KEYS = [
  'mumbai',
  'bombay',
  'thane',
  'navimumbai',
  'navi mumbai',
  'panvel',
  'kalyan',
  'dombivli',
  'dombivali',
  'vasai',
  'virar',
  'borivali',
  'andheri',
  'bandra',
];

const RAIGAD_FERRY_KEYS = [
  'alibaug',
  'alibag',
  'mandwa',
  'rewas',
  'kihim',
  'awas',
  'nagaon',
  'varsoli',
];

function mentionsAny(normStr: string, keys: readonly string[]): boolean {
  const compact = normStr.replace(/\s+/g, '');
  return keys.some((k) => {
    const key = k.replace(/\s+/g, '');
    return normStr.includes(k) || compact.includes(key);
  });
}

/** Returns passenger ferry + Ro-Ro options when route is Mumbai metro ↔ Raigad coast (e.g. Alibaug). */
export function getWaterCrossingSuggestions(from: string, to: string): WaterCrossingOption[] {
  const a = norm(from);
  const b = norm(to);
  if (!a || !b) return [];

  const coastalCorridor =
    (mentionsAny(a, MUMBAI_METRO_KEYS) && mentionsAny(b, RAIGAD_FERRY_KEYS)) ||
    (mentionsAny(b, MUMBAI_METRO_KEYS) && mentionsAny(a, RAIGAD_FERRY_KEYS));

  if (!coastalCorridor) return [];

  return [
    {
      id: 'mumbai-mandwa-passenger-ferry',
      name: 'Passenger ferry · Gateway of India → Mandwa',
      operator: 'M2M Ferries / approved operators (schedules vary)',
      mode: 'ferry',
      departure: 'Gateway of India',
      arrival: 'Mandwa Jetty · then taxi/bus to Alibaug coast',
      duration: '~45–60 min crossing · allow 1.5–2.5 h total',
      price: 'From ₹350 (foot passenger, indicative)',
      availability: 'Book via operator app or counter — confirm same‑day sailings & weather',
      note: 'Alibaug has no railway station; ferry is the common sea crossing from South Mumbai.',
    },
    {
      id: 'mumbai-mandwa-roro',
      name: 'Ro‑Ro ferry · Vehicle + passengers',
      operator: 'Ferry Wharf / Bhaucha Dhakka ↔ Mandwa (operators vary)',
      mode: 'roro',
      departure: 'Mumbai (Ferry Wharf area)',
      arrival: 'Mandwa · drive to final beach stay',
      duration: '~1–1.5 h crossing — check vehicle cut‑off times',
      price: 'From ₹900 (indicative; vehicle class & season vary)',
      availability: 'Vehicle slots often need advance booking',
      note: 'Carry car or bike across; confirm height/weight limits and documentation.',
    },
  ];
}
