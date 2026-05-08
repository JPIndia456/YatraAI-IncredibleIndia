export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { getSearchCache, setSearchCache } from '@/lib/services/searchCache';
import { AmadeusService } from '@/lib/services/travel/amadeus';
import { normalizeHotelSearchLocation, supplementHotelsForDestination } from '@/lib/hotelDestinationBoost';
import { GEMINI_MODEL } from '@/lib/geminiModel';

const HOTEL_CHAINS = [
  'Taj Hotels', 'Oberoi Hotels', 'ITC Hotels', 'Marriott', 'Leela Hotels',
  'Lemon Tree', 'OYO Rooms', 'Treebo Hotels', 'FabHotels', 'Radisson',
  'Hyatt Regency', 'Novotel', 'Holiday Inn', 'WelcomHotel', 'Sarovar Hotels'
];



const HOTELS_PER_OTA_PAGE = 20;
const HOTELS_RESPONSE_CAP = 50;
/** UI expectation: dense picker for every destination (OTAs + Gemini + gap-fill until this count). */
const MIN_HOTEL_OPTIONS = 30;

function dedupeHotelsByName(hotels: any[]): any[] {
  const uniqueHotels: any[] = [];
  const seenNames = new Set<string>();
  for (const h of hotels) {
    const simplifiedName = (h.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!simplifiedName || seenNames.has(simplifiedName)) continue;
    seenNames.add(simplifiedName);
    uniqueHotels.push(h);
  }
  return uniqueHotels;
}

function parseHotelsFromGeminiText(text: string, defaultSource: string): any[] {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return (parsed.hotels || []).map((h: any) => ({ ...h, source: h.source || defaultSource }));
  } catch {
    return [];
  }
}

/** Second-pass Gemini when OTAs + first model pass still return too few hotels. */
async function fetchGeminiHotelGapFill(params: {
  apiKey: string;
  resolvedLocation: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  existing: any[];
  minTotal: number;
}): Promise<any[]> {
  const { apiKey, resolvedLocation, checkIn, checkOut, guests, existing, minTotal } = params;
  const need = minTotal - existing.length;
  if (need <= 0) return [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const checkInFmt = checkIn ? new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'soon';
    const checkOutFmt = checkOut ? new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'later';
    const names = existing
      .map((h) => h.name)
      .filter(Boolean)
      .slice(0, 35)
      .join('; ');

    const prompt = `More hotels in ${resolvedLocation}, India. ${guests} guest(s), check-in ${checkInFmt}, check-out ${checkOutFmt}.

Hotels already in our list (do NOT repeat these names): ${names || '(none yet)'}.

Return ONLY raw JSON (no markdown):
{ "hotels": [ ... ] }

Include at least ${Math.max(need, 10)} NEW distinct real properties (budget to luxury). Each hotel object must have:
id, name, area, stars, rating, reviews, price (string like "₹5,000"), priceNum (number), perNight: true,
amenities (array), roomType, freeCancellation (boolean), breakfastIncluded (boolean), location (string), source (string).

Approximate INR per night only.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.15 },
    });

    return parseHotelsFromGeminiText(response.text ?? '', 'Google Live (fill)');
  } catch (e) {
    console.warn('[Gemini Hotels] Gap fill failed', e);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { location, checkIn, checkOut, guests = 1 } = await req.json();
    if (!location) return NextResponse.json({ success: false, error: 'Missing location' }, { status: 400 });

    const resolvedLocation = normalizeHotelSearchLocation(location);
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Supabase cache — only reuse if we still meet the minimum option count after merge + seeds
    const cached = await getSearchCache('hotels', { destination: resolvedLocation, date: checkIn });
    if (cached && Array.isArray(cached) && cached.length > 0) {
      const mergedCache = dedupeHotelsByName([
        ...cached,
        ...supplementHotelsForDestination(resolvedLocation, location),
      ]);
      const hotelsOut = mergedCache.slice(0, HOTELS_RESPONSE_CAP);
      if (hotelsOut.length >= MIN_HOTEL_OPTIONS) {
        return NextResponse.json({ success: true, hotels: hotelsOut, count: hotelsOut.length, source: 'cache' });
      }
    }

    let aggregatedHotels: any[] =
      cached && Array.isArray(cached) ? [...cached] : [];

    // 0. Amadeus Hotel List + Hotel Offers (same credentials as flights)
    const fetchAmadeus = async () => {
      try {
        if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) return [];
        if (!checkIn || !checkOut) return [];
        const rows = await AmadeusService.searchHotels({
          location: resolvedLocation,
          checkIn,
          checkOut,
          guests: Number(guests) || 1,
        });
        return Array.isArray(rows) ? rows : [];
      } catch (e) {
        console.warn('[Amadeus Hotels] Failed', e);
        return [];
      }
    };



    // 2. TripAdvisor RapidAPI
    const fetchTripAdvisor = async () => {
      try {
        if (!process.env.TRIPADVISOR_RAPIDAPI_KEY) return [];
        const destResp = await fetch(`https://${process.env.TRIPADVISOR_RAPIDAPI_HOST}/locations/search?query=${encodeURIComponent(resolvedLocation)}`, {
          headers: { 'x-rapidapi-key': process.env.TRIPADVISOR_RAPIDAPI_KEY, 'x-rapidapi-host': process.env.TRIPADVISOR_RAPIDAPI_HOST! }
        });
        const destData = await destResp.json();
        if (destData?.data?.[0]?.location_id) {
            const hotelResp = await fetch(`https://${process.env.TRIPADVISOR_RAPIDAPI_HOST}/hotels/search?location_id=${destData.data[0].location_id}&checkin=${checkIn}&checkout=${checkOut}&adults=${guests}&currency=INR`, {
              headers: { 'x-rapidapi-key': process.env.TRIPADVISOR_RAPIDAPI_KEY, 'x-rapidapi-host': process.env.TRIPADVISOR_RAPIDAPI_HOST! }
            });
            const hotelData = await hotelResp.json();
            return (hotelData?.data || []).slice(0, HOTELS_PER_OTA_PAGE).map((h: any) => ({
              id: `ta-${h.id || Math.random()}`,
              name: h.name || 'TripAdvisor Select',
              area: 'Downtown',
              stars: h.rating ? Math.floor(h.rating) : 4,
              rating: h.rating || 4.2,
              reviews: h.num_reviews || 250,
              price: h.price ? `₹${parseInt(h.price.replace(/[^0-9]/g, '')).toLocaleString('en-IN')}` : '₹12,000',
              priceNum: h.price ? parseInt(h.price.replace(/[^0-9]/g, '')) : 12000,
              perNight: true,
              amenities: ["WiFi", "Pool", "Spa"],
              roomType: "Standard Room",
              freeCancellation: true,
              breakfastIncluded: true,
              location: resolvedLocation,
              source: 'TripAdvisor'
            }));
        }
      } catch (e) { console.warn("[TripAdvisor API] Failed", e); }
      return [];
    };

    // 3. Gemini Fallback Search Grounding
    const fetchGemini = async () => {
      try {
        if (apiKey && apiKey !== 'dummy_key') {
          const ai = new GoogleGenAI({ apiKey });
          const checkInFmt = checkIn ? new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'tonight';
          const checkOutFmt = checkOut ? new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'tomorrow';

          const prompt = `Search for hotels and resorts in ${resolvedLocation} for ${guests} guest(s), check-in ${checkInFmt}, check-out ${checkOutFmt}.

You MUST return at least ${MIN_HOTEL_OPTIONS} distinct hotels in the "hotels" array (aim for ${Math.min(HOTELS_RESPONSE_CAP, MIN_HOTEL_OPTIONS + 6)} where real properties exist). Mix budget, mid-range and luxury; include beach resorts or town stays where relevant.

Return ONLY raw JSON (no markdown):
{
  "hotels": [
    {
      "id": "taj-001",
      "name": "Taj Lake Palace",
      "area": "Lake Pichola",
      "stars": 5,
      "rating": 4.8,
      "reviews": 3421,
      "price": "₹24,000",
      "priceNum": 24000,
      "perNight": true,
      "amenities": ["WiFi", "Pool", "Spa", "Restaurant", "Butler"],
      "roomType": "Deluxe Lake View",
      "freeCancellation": true,
      "breakfastIncluded": true,
      "location": "${resolvedLocation}",
      "source": "Google Live"
    }
  ]
}
Use approximate current INR per night. Prefer named hotels that actually operate in this destination.`;

          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { temperature: 0.1 }
          });

          return parseHotelsFromGeminiText(response.text ?? '', 'Google Live');
        }
      } catch (e) { console.warn("[Gemini API] Failed", e); }
      return [];
    };

    // Run all concurrently
    const results = await Promise.allSettled([
      fetchAmadeus(),
      fetchTripAdvisor(),
      fetchGemini(),
    ]);
    
    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        aggregatedHotels = [...aggregatedHotels, ...res.value];
      }
    });

    aggregatedHotels.push(...supplementHotelsForDestination(resolvedLocation, location));

    let uniqueHotels = dedupeHotelsByName(aggregatedHotels);

    if (apiKey && apiKey !== 'dummy_key') {
      let fillPasses = 0;
      while (uniqueHotels.length < MIN_HOTEL_OPTIONS && fillPasses < 5) {
        const extra = await fetchGeminiHotelGapFill({
          apiKey,
          resolvedLocation,
          checkIn: checkIn || '',
          checkOut: checkOut || '',
          guests: Number(guests) || 1,
          existing: uniqueHotels,
          minTotal: MIN_HOTEL_OPTIONS,
        });
        if (extra.length === 0) break;
        uniqueHotels = dedupeHotelsByName([...uniqueHotels, ...extra]);
        fillPasses += 1;
      }
    }

    if (uniqueHotels.length >= 1) {
      const topHotels = uniqueHotels.slice(0, HOTELS_RESPONSE_CAP);
      await setSearchCache('hotels', { destination: resolvedLocation, date: checkIn }, topHotels, 'aggregator');
      return NextResponse.json({ success: true, hotels: topHotels, count: topHotels.length, source: 'aggregator' });
    }

    return NextResponse.json({ success: false, error: 'No live hotels found in this area. Please try a different location.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
