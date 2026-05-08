export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from '@/lib/geminiModel';
import { getSearchCache, setSearchCache } from '@/lib/services/searchCache';

const TAXI_TYPES = [
  { type: 'Auto Rickshaw', pricePerKm: 12, base: 30 },
  { type: 'Ola Mini', pricePerKm: 14, base: 50 },
  { type: 'Ola Sedan', pricePerKm: 18, base: 60 },
  { type: 'Uber Go', pricePerKm: 15, base: 50 },
  { type: 'Uber Premier', pricePerKm: 20, base: 70 },
  { type: 'Rapido Bike', pricePerKm: 8, base: 20 },
  { type: 'InDriver', pricePerKm: 13, base: 45 },
  { type: 'Meru Cab', pricePerKm: 22, base: 80 },
];

const DRIVER_NAMES = [
  'Suresh Kumar', 'Rajesh Singh', 'Mohan Das', 'Vijay Sharma', 'Rahul Verma',
  'Anil Yadav', 'Ramesh Gupta', 'Sunil Patel', 'Deepak Mehta', 'Harish Nair',
];



export async function POST(req: Request) {
  try {
    const { location, destination } = await req.json();
    if (!location && !destination) return NextResponse.json({ success: false, error: 'Missing location' }, { status: 400 });

    const place = location || destination;

    // 1. Supabase cache check (taxis expire faster — used within the day)
    const cached = await getSearchCache('taxis', { destination: place });
    if (cached) {
      return NextResponse.json({ success: true, taxis: cached, count: cached.length, source: 'cache' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'dummy_key') {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Search for cab/taxi/auto services available in ${place}, India right now.
List 5 to 8 ride options from Ola, Uber, Rapido, Auto, Meru etc. with current fares. Return ONLY raw JSON:
{
  "taxis": [
    {
      "id": "ola-001",
      "type": "Ola Mini",
      "driverName": "Suresh Kumar",
      "driverRating": 4.5,
      "eta": "4 mins",
      "etaMins": 4,
      "price": "₹280",
      "priceNum": 280,
      "estimatedKm": "~8 km",
      "ac": true,
      "location": "${place}",
      "vehicleType": "Car"
    }
  ]
}
Include Auto Rickshaw, Ola Mini, Ola Sedan, Uber Go, Uber Premier, Rapido Bike if available in ${place}. Real approximate fares in INR.`;

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
          const taxis = (parsed.taxis || []).slice(0, 10);
          if (taxis.length >= 3) {
            await setSearchCache('taxis', { destination: place }, taxis, 'gemini-search');
            return NextResponse.json({ success: true, taxis, count: taxis.length, source: 'gemini-search' });
          }
        }
      } catch (err) {
        console.warn('[Taxis] Gemini grounding failed:', err);
      }
    }

    return NextResponse.json({ success: false, error: 'No live taxi options found in this area. Service might be temporarily unavailable.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
