/**
 * Normalizes messy destination strings for hotel provider queries and adds
 * curated seeds when OTAs/Gemini return few rows (common for small beach towns).
 */

export type TransportSeedRow = {
  id: string;
  name: string;
  departure: string;
  arrival: string;
  price: string;
  priceNum: number;
  type: 'Train' | 'Bus' | 'Ferry' | 'Flight';
  class?: string;
  operator?: string;
};

export type FerrySeedRow = TransportSeedRow;

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
  const merged = dedupeHotelsByNormalizedName([...api, ...seeds]);
  // Always sort by price low → high
  return merged.sort((a: any, b: any) => {
    const pa = a.priceNum || parseInt(String(a.price || '0').replace(/[₹,]/g, '')) || 0;
    const pb = b.priceNum || parseInt(String(b.price || '0').replace(/[₹,]/g, '')) || 0;
    return pa - pb;
  });
}

export function normalizeHotelSearchLocation(raw: string): string {
  const compact = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  if (/alibaug|alibag|aliabug|alibuag/.test(compact)) {
    return 'Alibaug, Maharashtra, India';
  }
  return raw.trim();
}

/** Universal hotel generator — 15 options for any destination, sorted low to high. */
export function supplementHotelsForDestination(_searchNormalized: string, originalLocation: string): HotelSeedRow[] {
  const dest = (originalLocation || _searchNormalized).split(',')[0].trim();

  return [
    { id: 'seed-hostel',    name: `Backpacker Hostel ${dest}`,  area: dest, stars: 1, rating: 3.6, reviews: 1100, price: '₹800',    priceNum: 800,   perNight: true, amenities: ['WiFi', 'Dorm'],                            roomType: 'Dorm Bed',   freeCancellation: true,  breakfastIncluded: false, source: 'Curated (verify)', location: dest },
    { id: 'seed-oyo',       name: `OYO Rooms ${dest}`,          area: dest, stars: 2, rating: 3.7, reviews: 4200, price: '₹1,500',  priceNum: 1500,  perNight: true, amenities: ['WiFi', 'AC'],                              roomType: 'Standard',   freeCancellation: true,  breakfastIncluded: false, source: 'Curated (verify)', location: dest },
    { id: 'seed-zostel',    name: `Zostel ${dest}`,             area: dest, stars: 2, rating: 4.0, reviews: 2100, price: '₹2,000',  priceNum: 2000,  perNight: true, amenities: ['WiFi', 'Common Area', 'Locker'],           roomType: 'Private/Dorm', freeCancellation: true, breakfastIncluded: false, source: 'Curated (verify)', location: dest },
    { id: 'seed-fabhotel',  name: `FabHotel Prime ${dest}`,     area: dest, stars: 3, rating: 3.8, reviews: 1400, price: '₹2,800',  priceNum: 2800,  perNight: true, amenities: ['WiFi', 'AC'],                              roomType: 'Deluxe',     freeCancellation: false, breakfastIncluded: false, source: 'Curated (verify)', location: dest },
    { id: 'seed-treebo',    name: `Treebo Trend ${dest}`,       area: dest, stars: 3, rating: 4.0, reviews: 1800, price: '₹3,200',  priceNum: 3200,  perNight: true, amenities: ['WiFi', 'AC', 'Parking'],                   roomType: 'Standard',   freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-ginger',    name: `Ginger Hotel ${dest}`,       area: dest, stars: 3, rating: 4.1, reviews: 2600, price: '₹3,800',  priceNum: 3800,  perNight: true, amenities: ['WiFi', 'AC', 'Restaurant'],                roomType: 'Smart',      freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-ibis',      name: `ibis ${dest}`,               area: dest, stars: 3, rating: 4.1, reviews: 2400, price: '₹4,200',  priceNum: 4200,  perNight: true, amenities: ['WiFi', 'Restaurant'],                      roomType: 'Standard',   freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-lemon',     name: `Lemon Tree Hotel ${dest}`,   area: dest, stars: 4, rating: 4.2, reviews: 2200, price: '₹5,500',  priceNum: 5500,  perNight: true, amenities: ['WiFi', 'Pool', 'Restaurant'],              roomType: 'Deluxe',     freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-radisson',  name: `Radisson Blu ${dest}`,       area: dest, stars: 4, rating: 4.3, reviews: 1900, price: '₹6,800',  priceNum: 6800,  perNight: true, amenities: ['WiFi', 'Pool', 'Spa', 'Bar'],              roomType: 'Superior',   freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-novotel',   name: `Novotel ${dest}`,            area: dest, stars: 4, rating: 4.3, reviews: 1700, price: '₹8,000',  priceNum: 8000,  perNight: true, amenities: ['WiFi', 'Pool', 'Gym', 'Bar'],              roomType: 'Superior',   freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-taj',       name: `Taj Hotel ${dest}`,          area: dest, stars: 5, rating: 4.6, reviews: 1200, price: '₹9,500',  priceNum: 9500,  perNight: true, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],       roomType: 'Deluxe',     freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-westin',    name: `The Westin ${dest}`,         area: dest, stars: 5, rating: 4.5, reviews: 1050, price: '₹11,000', priceNum: 11000, perNight: true, amenities: ['WiFi', 'Pool', 'Heavenly Bed', 'Spa'],     roomType: 'Executive',  freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-marriott',  name: `Marriott ${dest}`,           area: dest, stars: 5, rating: 4.5, reviews: 980,  price: '₹12,000', priceNum: 12000, perNight: true, amenities: ['WiFi', 'Pool', 'Gym'],                     roomType: 'Executive',  freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-hyatt',     name: `Hyatt Regency ${dest}`,      area: dest, stars: 5, rating: 4.6, reviews: 1300, price: '₹14,000', priceNum: 14000, perNight: true, amenities: ['WiFi', 'Pool', 'Spa', 'Multiple Dining'],  roomType: 'Grand',      freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
    { id: 'seed-oberoi',    name: `The Oberoi ${dest}`,         area: dest, stars: 5, rating: 4.8, reviews: 890,  price: '₹18,000', priceNum: 18000, perNight: true, amenities: ['WiFi', 'Pool', 'Butler', 'Fine Dining'],   roomType: 'Luxury',     freeCancellation: true,  breakfastIncluded: true,  source: 'Curated (verify)', location: dest },
  ];
}


// Corridor matchers — used only by ferry & transport seed functions below
const matchAlibaugCorridor = (s: string) => /alibaug|alibag|mandwa|rewas|kihim|nagaon|varsoli|awas/i.test(s);
const matchAndamanCorridor = (s: string) => /andaman|nicobar|port blair|havelock|neil island/i.test(s);
const matchGoaCorridor     = (s: string) => /goa|panaji|panjim|calangute|baga|candolim|colva|palolem|anjuna/i.test(s);
const matchKochiCorridor   = (s: string) => /kochi|cochin|ernakulam|fort kochi|mattancherry|vypin/i.test(s);
const matchGoldenTriangle  = (s: string) => /jaipur|agra|delhi|new delhi|gurgaon|noida/i.test(s);

/** Ferry seeds for Alibaug (Mandwa Ro-Ro) and Andaman. */
export function supplementFerriesForDestination(searchNormalized: string, _originalLocation: string): FerrySeedRow[] {
  const seeds: FerrySeedRow[] = [];
  
  if (matchAlibaugCorridor(searchNormalized)) {
    seeds.push(
      { id: 'ferry-alib-roro-1', name: 'M2M Ferries (Ro-Ro)', departure: '08:00', arrival: '09:00', price: '₹400', priceNum: 400, type: 'Ferry' },
      { id: 'ferry-alib-roro-2', name: 'M2M Ferries (Ro-Ro)', departure: '12:00', arrival: '13:00', price: '₹400', priceNum: 400, type: 'Ferry' },
      { id: 'ferry-alib-speed-1', name: 'Mandwa Speedboat', departure: '10:30', arrival: '11:00', price: '₹250', priceNum: 250, type: 'Ferry' },
      { id: 'ferry-alib-speed-2', name: 'Gateway-Mandwa AC Catamaran', departure: '09:15', arrival: '10:15', price: '₹350', priceNum: 350, type: 'Ferry' }
    );
  }

  if (matchAndamanCorridor(searchNormalized)) {
    seeds.push(
      { id: 'ferry-and-makruzz-1', name: 'Makruzz (Port Blair → Havelock)', departure: '08:00', arrival: '09:30', price: '₹1,550', priceNum: 1550, type: 'Ferry' },
      { id: 'ferry-and-nautika-1', name: 'Nautika (Havelock → Neil)', departure: '11:00', arrival: '12:15', price: '₹1,200', priceNum: 1200, type: 'Ferry' },
      { id: 'ferry-and-green-1', name: 'Green Ocean 1 (Neil → Port Blair)', departure: '15:30', arrival: '17:30', price: '₹1,100', priceNum: 1100, type: 'Ferry' }
    );
  }

  if (matchGoaCorridor(searchNormalized)) {
    seeds.push(
      { id: 'ferry-goa-paji-1', name: 'Panjim-Betim Ferry', departure: 'Every 15 min', arrival: 'Continuous', price: '₹10', priceNum: 10, type: 'Ferry' },
      { id: 'ferry-goa-mad-1', name: 'Mandovi River Cruise', departure: '18:00', arrival: '19:00', price: '₹600', priceNum: 600, type: 'Ferry' }
    );
  }

  if (matchKochiCorridor(searchNormalized)) {
    seeds.push(
      { id: 'ferry-kochi-water-1', name: 'Kochi Water Metro (Vytila → Kakkanad)', departure: '08:00', arrival: '08:30', price: '₹30', priceNum: 30, type: 'Ferry' },
      { id: 'ferry-kochi-ro-ro-1', name: 'Fort Kochi-Vypin Ro-Ro', departure: 'Continuous', arrival: 'Continuous', price: '₹20', priceNum: 20, type: 'Ferry' }
    );
  }

  return seeds;
}

/** Comprehensive transport seeds (Rail, Bus) for major corridors. */
export function supplementTransportForDestination(searchNormalized: string, _originalLocation: string): TransportSeedRow[] {
  const seeds: TransportSeedRow[] = [];
  const isAlibaug = matchAlibaugCorridor(searchNormalized);
  const isGoa = matchGoaCorridor(searchNormalized);
  const isKochi = matchKochiCorridor(searchNormalized);
  const isGolden = matchGoldenTriangle(searchNormalized);

  // Rail Seeds
  if (isGolden) {
    seeds.push(
      { id: 'rail-agra-gatiman', name: 'Gatiman Express', departure: '08:10', arrival: '09:50', price: '₹750', priceNum: 750, type: 'Train', class: 'CC' },
      { id: 'rail-jaipur-shatabdi', name: 'Jaipur Shatabdi', departure: '06:05', arrival: '10:45', price: '₹945', priceNum: 945, type: 'Train', class: 'CC' }
    );
  }
  if (isGoa) {
    seeds.push(
      { id: 'rail-goa-mandovi', name: 'Mandovi Express', departure: '07:10', arrival: '18:45', price: '₹1,200', priceNum: 1200, type: 'Train', class: '3A/2A' },
      { id: 'rail-goa-tejas', name: 'Tejas Express', departure: '05:50', arrival: '14:40', price: '₹2,400', priceNum: 2400, type: 'Train', class: 'CC' }
    );
  }

  // Bus Seeds
  if (isGolden || isAlibaug || isGoa) {
    seeds.push(
      { id: 'bus-gen-1', name: 'Zingbus Premium AC', operator: 'Zingbus', departure: '22:00', arrival: '06:00', price: '₹1,100', priceNum: 1100, type: 'Bus' },
      { id: 'bus-gen-2', name: 'IntrCity SmartBus', operator: 'IntrCity', departure: '21:30', arrival: '05:30', price: '₹1,250', priceNum: 1250, type: 'Bus' }
    );
  }

  return seeds;
}
