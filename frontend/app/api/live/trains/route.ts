export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { GEMINI_MODEL } from '@/lib/geminiModel';
import { GoogleGenAI } from "@google/genai";
import { getSearchCache, setSearchCache } from '@/lib/services/searchCache';
import { getWaterCrossingSuggestions } from '@/lib/waterTransportSuggestions';

const CITY_TO_STATION: Record<string, string> = {
  'mumbai': 'CSTM', 'delhi': 'NDLS', 'bangalore': 'SBC', 'bengaluru': 'SBC',
  'hyderabad': 'HYB', 'chennai': 'MAS', 'kolkata': 'HWH', 'pune': 'PUNE',
  'jaipur': 'JP', 'ahmedabad': 'ADI', 'lucknow': 'LKO', 'srinagar': 'SVDK',
  'jammu': 'JAT', 'amritsar': 'ASR', 'chandigarh': 'CDG', 'bhopal': 'BPL',
  'nagpur': 'NGP', 'varanasi': 'BSB', 'patna': 'PNBE', 'guwahati': 'GHY',
  'kochi': 'ERS', 'thiruvananthapuram': 'TVC', 'madurai': 'MDU',
  'visakhapatnam': 'VSKP', 'bhubaneswar': 'BBS', 'ranchi': 'RNC',
  'indore': 'INDB', 'mysore': 'MYS', 'coimbatore': 'CBE', 'agra': 'AGC',
  'jodhpur': 'JU', 'udaipur': 'UDZ', 'bikaner': 'BKN', 'jaisalmer': 'JSM',
  'goa': 'MAO', 'panaji': 'MAO', 'aurangabad': 'AWB', 'shimla': 'SML',
  'manali': 'ANS', 'rishikesh': 'RKSH', 'haridwar': 'HW', 'dehradun': 'DDN',
};

/** Tourist localities often used as destinations but with no IR station — use a real junction for timetables. */
const LOCALITY_NEAREST_STATION: Array<{ keywords: string[]; code: string; note: string }> = [
  {
    keywords: ['alibaug', 'alibag', 'alibuag'],
    code: 'PEN',
    note: 'Alibaug has no railway station. Trains shown are to/from Pen (PEN); add taxi or bus for the last leg.',
  },
  {
    keywords: ['diveagar', 'dive agar', 'harihareshwar'],
    code: 'PEN',
    note: 'This coastal area has no station at the beach; nearest useful railhead is Pen (PEN) with onward road transfer.',
  },
  {
    keywords: ['murud janjira', 'janjira'],
    code: 'ROHA',
    note: 'Murud-Janjira area has no station at the fort; trains use Roha (ROHA) or Pen (PEN) with road transfer — verify locally.',
  },
];

function normalizePlaceName(cityName: string): string {
  return cityName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveTrainStationCode(cityName: string): { code: string; note?: string } {
  const norm = normalizePlaceName(cityName);
  if (!norm) return { code: '' };

  for (const loc of LOCALITY_NEAREST_STATION) {
    for (const kw of loc.keywords) {
      if (norm.includes(kw)) return { code: loc.code, note: loc.note };
    }
  }

  const lower = cityName.toLowerCase().trim();
  for (const [key, code] of Object.entries(CITY_TO_STATION)) {
    if (lower.includes(key) || key.includes(lower)) return { code };
  }

  const sliced = cityName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return sliced.length >= 2 ? { code: sliced } : { code: '' };
}

function buildStationNotes(from: string, to: string): { notes: string[]; fromResolved: ReturnType<typeof resolveTrainStationCode>; toResolved: ReturnType<typeof resolveTrainStationCode> } {
  const fromResolved = resolveTrainStationCode(from);
  const toResolved = resolveTrainStationCode(to);
  const notes: string[] = [];
  if (fromResolved.note) notes.push(`${from.trim()}: ${fromResolved.note}`);
  if (toResolved.note) notes.push(`${to.trim()}: ${toResolved.note}`);
  return { notes, fromResolved, toResolved };
}

export async function POST(req: Request) {
  try {
    const { from, to, date } = await req.json();
    if (!from || !to || !date) {
      return NextResponse.json({ success: false, error: 'Missing from, to, or date' }, { status: 400 });
    }

    const { notes: station_notes, fromResolved, toResolved } = buildStationNotes(from, to);
    const fromCode = fromResolved.code;
    const toCode = toResolved.code;
    const water_transport = getWaterCrossingSuggestions(from, to);

    // 1. Supabase cache check (instant, avoids all API calls)
    const cached = await getSearchCache('trains', { origin: from, destination: to, date });
    if (cached) {
      return NextResponse.json({
        success: true,
        trains: cached,
        count: cached.length,
        source: 'cache',
        resolved_from_code: fromCode,
        resolved_to_code: toCode,
        station_notes,
        water_transport,
      });
    }

    // Try erail.in real-time data first
    try {
      if (!fromCode || !toCode) throw new Error('Could not resolve station codes for origin/destination');
      const url = `https://erail.in/rail/getTrains.aspx?Station_From=${fromCode}&Station_To=${toCode}&DataSource=0&Language=0&Cache=true`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await response.text();

      // Parse the pipe-delimited erail format
      const lines = text.split('\n').filter(l => l.trim() && l.includes('|'));
      const trains: any[] = [];

      for (const line of lines) {
        const parts = line.split('~');
        if (parts.length < 5) continue;
        const base = parts[0]?.split('|') || [];
        if (base.length < 8) continue;
        trains.push({
          id: base[1]?.trim(),
          name: base[2]?.trim(),
          number: base[1]?.trim(),
          from: base[3]?.trim() || fromCode,
          to: base[4]?.trim() || toCode,
          departure: base[5]?.trim() || '--',
          arrival: base[6]?.trim() || '--',
          duration: base[7]?.trim() || '--',
          classes: ['SL', '3A', '2A', '1A'],
          price: null,
          priceDisplay: 'Check IRCTC',
          availability: 'Check Availability',
          source: 'erail'
        });
        if (trains.length >= 10) break;
      }

      if (trains.length >= 3) {
        const finalTrains = trains.slice(0, 10);
        await setSearchCache('trains', { origin: from, destination: to, date }, finalTrains, 'erail');
        return NextResponse.json({
          success: true,
          trains: finalTrains,
          count: finalTrains.length,
          source: 'erail',
          resolved_from_code: fromCode,
          resolved_to_code: toCode,
          station_notes,
          water_transport,
        });
      }
    } catch (erailErr) {
      console.warn('[Trains] erail.in failed, trying Gemini grounding:', erailErr);
    }

    // Gemini Search Grounding fallback for real train data
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'dummy_key') {
      const ai = new GoogleGenAI({ apiKey });
      const dateFormatted = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

      const stationRule =
        station_notes.length > 0
          ? `STRICT: ${station_notes.join(' ')} Use only real stations (origin rail code ${fromCode}, destination rail code ${toCode}). Never invent a station inside a town that has no rail line.\n`
          : '';

      const prompt = `${stationRule}Search Indian Railways for trains between IR stations ${fromCode} (${from}) and ${toCode} (${to}) on ${dateFormatted}.
List 5 to 8 real trains with accurate timing. Return ONLY raw JSON (no markdown):
{
  "trains": [
    {
      "id": "12951",
      "name": "Mumbai Rajdhani Express",
      "number": "12951",
      "from": "${fromCode}",
      "to": "${toCode}",
      "departure": "16:35",
      "arrival": "08:15+1",
      "duration": "15h 40m",
      "classes": ["1A", "2A", "3A"],
      "price": "₹1,655",
      "availability": "Available",
      "daysOfWeek": "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
    }
  ]
}
Return 5-8 real trains that actually run on this route.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { temperature: 0.1 }
      });

      const text = response.text ?? '';
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        const trains = (parsed.trains || []).slice(0, 10);
        if (trains.length > 0) {
          await setSearchCache('trains', { origin: from, destination: to, date }, trains, 'gemini-search');
          return NextResponse.json({
            success: true,
            trains,
            count: trains.length,
            source: 'gemini-search',
            resolved_from_code: fromCode,
            resolved_to_code: toCode,
            station_notes,
            water_transport,
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No live trains found for this route. Railway servers might be busy.',
      water_transport,
      resolved_from_code: fromCode,
      resolved_to_code: toCode,
      station_notes,
    }, { status: 404 });

  } catch (err: any) {
    console.error('[TRAINS_API_ERROR]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
