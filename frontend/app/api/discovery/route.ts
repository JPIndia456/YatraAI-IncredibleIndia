import { NextResponse } from 'next/server';
import { resilientGenerateContent } from '@/lib/services/ai/resilience';
import { parseDiscoverySuggestionsJson } from '@/lib/parseAiItineraryJson';

export async function POST(req: Request) {
  try {
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
${destFilter}

Return ONLY a raw JSON array. NO markdown fences (like \`\`\`json). NO preamble. NO conversational text. 
The output must start with [ and end with ] and be perfectly parseable.
The values (title, why, tags, caring_tip, connectivity, weather_summary, safety_score, sustainability_hint, etc.) MUST be in ${langName}.

RULES:
- **Zero Hallucination**: Use Ground Truth. Do NOT suggest imaginary flight numbers or non-existent hotels. If unsure, use real, prominent brands (e.g. IndiGo, Air India, Taj, Marriott, RedBus, M2M Ferries).
- **Nearest Location First**: Prioritize destinations that are geographically closer to ${origin}.
- **Multi-modal Connectivity**: Suggest **per-person** fares for Flight, Train, and Bus for the requested trip type (${tripType === 'round' ? 'ROUND-TRIP' : 'ONE-WAY'}).
- **Ferry Awareness**: If the route is coastal (e.g. Mumbai to Alibaug, Kochi, or Andamans), include a "ferry_cost" and "ferry_note" if applicable.
- **Hotel Pricing**: Suggest a **total price per night** for all ${party} people.
- **Total Estimate**: Calculate the total trip cost as: (Primary Transport × ${party}) + (Hotel × ${nights}).
- **Budget Check**: The final total estimate for all ${party} people MUST be ≤ ₹${targetBudget}.
- If flights exceed budget, set flight_cost to "N/A".
- Vary regions: do not repeat the same state for all 4.

Format for each object:
{
  "title": string,
  "destination": string,
  "vibe": string,
  "why": string,
  "totalPrice": number,
  "budget_cost_estimate": string,
  "flight_cost": "₹X per person RT",
  "train_cost": "₹X per person RT",
  "bus_cost": "₹X per person RT",
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
  "tags": string[],
  "caring_tip": string,
  "safety_score": "X/5",
  "sustainability_hint": string,
  "location_check": string
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

    // --- TRANSLATION FALLBACK (If AI output needs refinement or user wants specific provider) ---
    const bhashiniKey = process.env.BHASHINI_API_KEY;
    const sarvamKey = process.env.SARVAM_API_KEY;
    const isBhashiniReady = bhashiniKey && !/REPLACE|PASTE|YOUR|XXX/i.test(bhashiniKey);
    const isSarvamReady = sarvamKey && !/REPLACE|PASTE|YOUR|XXX/i.test(sarvamKey);

    if (language !== 'en' && (isBhashiniReady || isSarvamReady)) {
      try {
        const { translateText } = await import("@/lib/bhashini"); // Placeholder for Sarvam too or unified lib
        
        // If the AI already returned the requested language, we might skip, 
        // but Bhashini/Sarvam are better for nuances.
        suggestions = await Promise.all(suggestions.map(async (s: any) => {
          const fieldsToTranslate = [
            'why', 'title', 'caring_tip', 'safety_score', 'sustainability_hint', 
            'weather_summary', 'flight_name', 'flight_time', 'hotel_name', 'hotel_location', 'location_check'
          ];

          const translatedValues = await Promise.all(fieldsToTranslate.map(async (f) => {
            if (!s[f]) return s[f];
            // Unified translation logic would go here. For now, using our hardened Bhashini lib.
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

    return NextResponse.json({ 
      success: true, 
      suggestions, 
      model: result.model,
      grounded: result.grounded
    });

  } catch (err: any) {
    console.error("Discovery Route Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
