export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from '@/lib/geminiModel';
import { getSearchCache, setSearchCache } from '@/lib/services/searchCache';

const BUS_OPERATORS = [
  'KSRTC', 'MSRTC', 'UPSRTC', 'GSRTC', 'HRTC', 'RSRTC',
  'RedBus', 'ZingBus', 'VRL Travels', 'SRS Travels',
  'Orange Travels', 'Parveen Travels', 'IntrCity SmartBus', 'Neeta Tours',
];



export async function POST(req: Request) {
  try {
    const { from, to, date } = await req.json();
    if (!to) return NextResponse.json({ success: false, error: 'Missing destination' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'dummy_key' && from) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const dateFmt = date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'today';

        const prompt = `Search for bus services from ${from} to ${to}, India on ${dateFmt}.
List 5 to 8 real bus services with current prices. Return ONLY raw JSON:
{
  "buses": [
    {
      "id": "ksrtc-001",
      "operator": "KSRTC",
      "type": "Volvo AC",
      "from": "${from}",
      "to": "${to}",
      "departure": "22:00",
      "arrival": "06:30+1",
      "duration": "8h 30m",
      "price": "₹850",
      "priceNum": 850,
      "seatsAvailable": 12,
      "rating": 4.2,
      "amenities": ["AC", "Blanket", "Charging Point"]
    }
  ]
}
Include real bus operators like KSRTC, RedBus, ZingBus, VRL, SRS, IntrCity etc. with real approximate prices.`;

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
          const buses = (parsed.buses || []).slice(0, 10);
          if (buses.length >= 3) {
            await setSearchCache('buses', { origin: from, destination: to, date }, buses, 'gemini-search');
            return NextResponse.json({ success: true, buses, count: buses.length, source: 'gemini-search' });
          }
        }
      } catch (err) {
        console.warn('[Buses] Gemini grounding failed:', err);
      }
    }

    return NextResponse.json({ success: false, error: 'No live bus options found for this route.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
