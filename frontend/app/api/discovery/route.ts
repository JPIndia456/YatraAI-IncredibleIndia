import { NextResponse } from 'next/server';
import { resilientGenerateContent } from '@/lib/services/ai/resilience';
import { parseDiscoverySuggestionsJson } from '@/lib/parseAiItineraryJson';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'discovery', 20, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const { 
      origin, targetBudget, startDate, endDate, adults, kids = 0, 
      language = 'en', destTypes = [], destHint = '', tripType = 'round' 
    } = body;
    
    const party = adults + kids;
    
    // Calculate nights for prompt
    let nights = 1;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      nights = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const destFilter = destTypes.length > 0 ? `ONLY suggest destinations matching: ${destTypes.join(', ')}.` : 'Suggest varied destinations across India.';
    const destHintLine = destHint ? `User prefers: "${destHint}". Include it or close matches.` : '';
    const langName = language === 'hi' ? 'Hindi' : 'English';

    const systemPrompt = `You are Yatra Discovery Engine. Suggest exactly 4 Indian destinations for a trip from ${origin}.
${destHintLine}
Budget: ₹${targetBudget} total for ${party} people. Duration: ${nights} nights. Trip: ${tripType}. Language: ${language}.
Tier: ${body.budget || 'Standard'} (Prioritize ${body.budget === 'luxury' ? 'Premium Stays/Flights' : body.budget === 'economy' ? 'Value Rail/Bus/3-star' : 'Balanced options'}).
${destFilter} If the user selects "Beaches", do NOT suggest mountains/hill stations (like Matheran, Mahabaleshwar). If they select "Mountains", do NOT suggest coastal towns. CATEGORY INTEGRITY IS PARAMOUNT.

Return ONLY a raw JSON array. NO markdown fences (like \`\`\`json). NO preamble. NO conversational text. 
The output must start with [ and end with ] and be perfectly parseable.
The values (title, why, tags, caring_tip, connectivity, weather_summary, safety_score, sustainability_hint, etc.) MUST be in ${langName}.

RULES:
- **Zero Hallucination**: Use Ground Truth. Do NOT suggest imaginary flight numbers or non-existent hotels. If unsure, use real, prominent brands (e.g. IndiGo, Air India, Taj, Marriott, RedBus, M2M Ferries).
- **Nearest Location First**: Prioritize destinations that are geographically closer to ${origin}.
- **Multi-modal Connectivity**: MUST suggest **per-person** fares for Flight, Train, AND Bus. If tripType is "round", these MUST be **TOTAL RETURN FARES**.
- **Minimalist Flight Details**: Do NOT include flight numbers (e.g., 6E-123) or departure times in "flight_name". ONLY suggest the airline brand (e.g., IndiGo, Air India).
- **Rail & Bus Enforcement**: NEVER set train_cost or bus_cost to "N/A". Use realistic IRCTC (3A/2A) and sleeper bus estimates if live data is slow.
- **Proximity Logic**: If the destination is within **500 km** of ${origin}, you MUST prioritize Bus and Rail data as the most viable options.
- **Ferry Awareness**: If the route is coastal (e.g. Mumbai to Alibaug, Kochi, or Andamans), include a "ferry_cost" and "ferry_note" if applicable.
- **Hotel Pricing**: Suggest a **total price per night** for all ${party} people.
- **Total Estimate**: Calculate the total trip cost as: (Primary Transport × ${party}) + (Hotel × ${nights}).
- **Budget Check**: The final total estimate for all ${party} people MUST be ≤ ₹${targetBudget}.
- If flights exceed budget, set flight_cost to "N/A" but KEEP train and bus.
- **STRICT VIBE ENFORCEMENT**: If "Beaches" is requested, every suggestion MUST be coastal. No hill stations allowed.
- Vary regions: do not repeat the same state for all 4.

Format for each object:
{
  "title": string,
  "destination": string,
  "vibe": string,
  "why": string,
  "totalPrice": number,
  "budget_cost_estimate": string,
  "flight_cost": "₹X per person",
  "train_cost": "₹X per person",
  "bus_cost": "₹X per person",
  "ferry_cost": "₹X per person (optional)",
  "ferry_note": string,
  "hotel_per_night": "₹X total for ${party}/night",
  "hotel_name": string,
  "hotel_location": "Area name/Neighborhood",
  "flight_name": string,
  "train_name": string,
  "bus_operator": string,
  "nearest_airport": string,
  "nearest_railway": string,
  "connectivity": string,
  "weather_summary": "X°C, Condition (e.g. Sunny/Cool)",
  "flight_time": "Xh Ym",
  "tags": string[],
  "caring_tip": string,
  "safety_score": "X/5",
  "sustainability_hint": string,
  "location_check": string,
  "distance_km": number
}`;

    const result = await resilientGenerateContent(`Trips from ${origin}`, {
      useGrounding: true,
      systemPrompt,
      jsonMode: true
    });

    if (!result || !result.text) {
      throw new Error("Discovery Engine failed to generate travel cards.");
    }

    let suggestions: any[];
    try {
      suggestions = parseDiscoverySuggestionsJson(result.text) as any[];
    } catch (parseErr) {
      console.error("Discovery JSON parse failed:", parseErr, "\nSnippet:", result.text.slice(0, 800));
      throw parseErr instanceof Error ? parseErr : new Error(String(parseErr));
    }

    // --- TRANSLATION FALLBACK (Disabled to prevent 79s+ latency; AI already handles language) ---
    /*
    if (language !== 'en' && (isBhashiniReady || isSarvamReady)) {
      try {
        const { translateText } = await import("@/lib/bhashini");
        suggestions = await Promise.all(suggestions.map(async (s: any) => {
          const fieldsToTranslate = [
            'why', 'title', 'caring_tip', 'safety_score', 'sustainability_hint', 
            'weather_summary', 'flight_name', 'flight_time', 'hotel_name', 'hotel_location', 'location_check'
          ];
          const translatedValues = await Promise.all(fieldsToTranslate.map(async (f) => {
            if (!s[f]) return s[f];
            return await translateText(s[f], 'en', language);
          }));
          const updated: any = { ...s };
          fieldsToTranslate.forEach((f, idx) => {
            updated[f] = translatedValues[idx];
          });
          return updated;
        }));
      } catch (e) { console.warn("Secondary translation failed, using AI's native output."); }
    }
    */

    // --- DATA REPAIR LAYER (Hardened for Rail/Bus visibility & Short-Distance logic) ---
    const isBeachRequest = destTypes.some((t: string) => t.toLowerCase().includes('beach'));
    const hillStations = ['matheran', 'mahabaleshwar', 'lonavala', 'khandala', 'panchgani', 'manali', 'shimla', 'munnar', 'ooty'];

    suggestions = suggestions
      .filter((s: any) => {
        if (isBeachRequest) {
          const title = (s.title || '').toLowerCase();
          const dest = (s.destination || '').toLowerCase();
          return !hillStations.some(h => title.includes(h) || dest.includes(h));
        }
        return true;
      })
      .map((s: any) => {
      const updated = { ...s };
      const isGoa = s.destination?.toLowerCase().includes('goa') || s.title?.toLowerCase().includes('goa');
      const isAlibag = s.destination?.toLowerCase().includes('alibag') || s.title?.toLowerCase().includes('alibag');
      const dist = Number(s.distance_km) || 0;

      // Distance Rule: No flights under 150km
      if (dist < 150) {
        updated.flight_cost = 'N/A';
        updated.flight_name = 'Not Available (Short Distance)';
      }

      // Alibag Special: Ro-Ro Ferry is the primary mode
      if (isAlibag) {
        updated.ferry_cost = '₹800 per person';
        updated.ferry_note = 'M2M Ro-Ro Ferry (Mazgaon to Mandwa)';
        updated.bus_cost = '₹400 per person';
        updated.bus_operator = 'MSRTC Shivneri / Private AC';
      }
      
      // Force realistic defaults if AI is being lazy or grounded is offline
      if ((!s.train_cost || s.train_cost === 'N/A') && !isAlibag) {
        updated.train_cost = isGoa ? '₹1,500 per person' : '₹1,200 per person';
        updated.train_name = isGoa ? 'Konkan Kanya / Tejas Exp' : 'Express Rail';
      }
      if (!s.bus_cost || s.bus_cost === 'N/A') {
        updated.bus_cost = isGoa ? '₹1,100 per person' : isAlibag ? '₹400 per person' : '₹900 per person';
        updated.bus_operator = isGoa ? 'Zingbus / Paulo Travels' : isAlibag ? 'MSRTC' : 'RedBus Express';
      }
      if (!s.flight_cost || s.flight_cost === 'N/A' || dist < 150) {
        updated.flight_cost = 'N/A';
      } else if (!s.flight_cost || s.flight_cost === 'N/A') {
        updated.flight_cost = isGoa ? '₹4,500 per person' : '₹5,000 per person';
        updated.flight_name = 'IndiGo / Air India';
      }
      return updated;
    });

    return NextResponse.json({ 
      success: true, 
      suggestions, 
      model: result.model,
      grounded: result.grounded
    });

  } catch (err: unknown) {
    console.error("Discovery Route Error:", err);
    const message = err instanceof Error ? err.message : 'Discovery generation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
