/**
 * Normalizes messy destination strings for hotel provider queries and adds
 * curated seeds when OTAs/Gemini return few rows (common for small beach towns).
 */

export type HotelSeedRow = {
  id: string;
  name: string;
  area: string;
  stars: number;
  rating: number;
  reviews: number;
  price: string;
  priceNum: number;
  perNight: true;
  amenities: string[];
  roomType: string;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  location: string;
  source: string;
};

/** Same name normalisation as `/api/live/hotels` — merge API + curated rows without duplicates. */
export function dedupeHotelsByNormalizedName(hotels: unknown[]): any[] {
  const unique: any[] = [];
  const seen = new Set<string>();
  for (const h of hotels) {
    if (!h || typeof h !== 'object') continue;
    const row = h as Record<string, unknown>;
    const simplifiedName = String(row.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!simplifiedName || seen.has(simplifiedName)) continue;
    seen.add(simplifiedName);
    unique.push(row);
  }
  return unique;
}

/** Ensures small towns (e.g. Alibaug) still get many pickable stays when OTAs return 0–1 rows. */
export function mergeApiHotelsWithCuratedSeeds(apiHotels: unknown[] | undefined, destination: string): any[] {
  const api = Array.isArray(apiHotels) ? apiHotels : [];
  const norm = normalizeHotelSearchLocation(destination);
  const seeds = supplementHotelsForDestination(norm, destination);
  return dedupeHotelsByNormalizedName([...api, ...seeds]);
}

export function normalizeHotelSearchLocation(raw: string): string {
  const compact = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  if (/alibaug|alibag|aliabug|alibuag/.test(compact)) {
    return 'Alibaug, Maharashtra, India';
  }
  return raw.trim();
}

function matchAlibaugCorridor(raw: string): boolean {
  return /alibaug|alibag|aliabug|alibuag|mandwa|rewas|kihim|nagaon beach|nagaon|varsoli|awas/i.test(raw);
}

/** Indicative stays — verify live rates on OTAs; fills gaps when Booking/TA/Gemini return almost nothing. */
export function supplementHotelsForDestination(searchNormalized: string, originalLocation: string): HotelSeedRow[] {
  const label = originalLocation.trim() || searchNormalized;
  if (!matchAlibaugCorridor(searchNormalized) && !matchAlibaugCorridor(originalLocation)) {
    return [];
  }

  const seeds: Omit<HotelSeedRow, 'location'>[] = [
    {
      id: 'seed-alib-radisson',
      name: 'Radisson Blu Resort & Spa Alibaug',
      area: 'Alibaug beach belt',
      stars: 5,
      rating: 4.6,
      reviews: 2100,
      price: '₹14,500',
      priceNum: 14500,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
      roomType: 'Deluxe',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-fern',
      name: 'The Fern Silvanus Resort Alibaug',
      area: 'Near Varsoli',
      stars: 4,
      rating: 4.3,
      reviews: 980,
      price: '₹9,200',
      priceNum: 9200,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Restaurant'],
      roomType: 'Superior',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-tropicana',
      name: 'U Tropicana Alibaug',
      area: 'Chaul-Alibaug road',
      stars: 4,
      rating: 4.2,
      reviews: 760,
      price: '₹8,800',
      priceNum: 8800,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Restaurant'],
      roomType: 'Garden Room',
      freeCancellation: true,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-maple',
      name: 'Maple Ivy Villas Alibaug',
      area: 'Varsoli side',
      stars: 4,
      rating: 4.4,
      reviews: 520,
      price: '₹11,000',
      priceNum: 11000,
      perNight: true,
      amenities: ['WiFi', 'Kitchenette', 'Parking'],
      roomType: 'Villa',
      freeCancellation: true,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-big-splash',
      name: 'Big Splash Resort Alibaug',
      area: 'Close to Varsoli Beach',
      stars: 4,
      rating: 4.1,
      reviews: 890,
      price: '₹7,500',
      priceNum: 7500,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Kids zone'],
      roomType: 'Deluxe',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-irani',
      name: 'Irani Resort Alibaug',
      area: 'Beach belt',
      stars: 3,
      rating: 4.1,
      reviews: 880,
      price: '₹5,800',
      priceNum: 5800,
      perNight: true,
      amenities: ['WiFi', 'Restaurant', 'Parking'],
      roomType: 'Standard',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-outpost',
      name: 'The Outpost Alibaug',
      area: 'Near Rewas jetty route',
      stars: 4,
      rating: 4.3,
      reviews: 620,
      price: '₹10,500',
      priceNum: 10500,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Restaurant'],
      roomType: 'Deluxe',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-sai-inn',
      name: 'Hotel Sai Inn Alibaug',
      area: 'Alibaug town',
      stars: 3,
      rating: 4.0,
      reviews: 540,
      price: '₹4,200',
      priceNum: 4200,
      perNight: true,
      amenities: ['WiFi', 'AC', 'Parking'],
      roomType: 'Standard',
      freeCancellation: false,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-sahil',
      name: 'Hotel Sahil Palace Alibaug',
      area: 'Market road',
      stars: 3,
      rating: 3.9,
      reviews: 380,
      price: '₹3,800',
      priceNum: 3800,
      perNight: true,
      amenities: ['WiFi', 'AC'],
      roomType: 'Standard',
      freeCancellation: false,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-golden-swan',
      name: 'Golden Swan Beach Resort',
      area: 'Beach belt',
      stars: 3,
      rating: 4.0,
      reviews: 290,
      price: '₹6,400',
      priceNum: 6400,
      perNight: true,
      amenities: ['WiFi', 'Restaurant'],
      roomType: 'Sea-facing',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-paramount',
      name: 'Paramount Resort Alibaug',
      area: 'Near Kashid direction approach',
      stars: 3,
      rating: 3.9,
      reviews: 210,
      price: '₹5,900',
      priceNum: 5900,
      perNight: true,
      amenities: ['WiFi', 'Parking'],
      roomType: 'Standard',
      freeCancellation: true,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-adamo',
      name: 'Adamo Resort Alibaug',
      area: 'Varsoli locale',
      stars: 4,
      rating: 4.2,
      reviews: 670,
      price: '₹12,400',
      priceNum: 12400,
      perNight: true,
      amenities: ['WiFi', 'Pool', 'Restaurant'],
      roomType: 'Suite',
      freeCancellation: true,
      breakfastIncluded: true,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-pushpak',
      name: 'Hotel Pushpak Alibaug',
      area: 'Town centre',
      stars: 3,
      rating: 3.8,
      reviews: 440,
      price: '₹3,200',
      priceNum: 3200,
      perNight: true,
      amenities: ['WiFi', 'AC'],
      roomType: 'Standard',
      freeCancellation: false,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-vikas',
      name: 'Hotel Vikas Inn Alibaug',
      area: 'Near ST stand area',
      stars: 3,
      rating: 3.8,
      reviews: 260,
      price: '₹3,600',
      priceNum: 3600,
      perNight: true,
      amenities: ['WiFi', 'AC'],
      roomType: 'Standard',
      freeCancellation: false,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
    {
      id: 'seed-alib-ravikiran',
      name: 'Hotel Ravikiran Alibaug',
      area: 'Town centre',
      stars: 3,
      rating: 4.0,
      reviews: 620,
      price: '₹3,400',
      priceNum: 3400,
      perNight: true,
      amenities: ['WiFi', 'AC', 'Parking'],
      roomType: 'Standard',
      freeCancellation: false,
      breakfastIncluded: false,
      source: 'Curated (verify)',
    },
  ];

  return seeds.map((s) => ({ ...s, location: label }));
}
