import { NextResponse } from "next/server";
import { resilientGenerateContent } from "@/lib/services/ai/resilience";
import { parseDiscoverySuggestionsJson } from "@/lib/parseAiItineraryJson";

export const maxDuration = 60; // Extended timeout for Grounding & Bhashini

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, targetBudget, startDate, endDate, adults, kids = 0, language = 'en', specificDestination = '', tripType = 'round' } = body;
    // Defensive: rehydrated zustand state can produce a non-array for destTypes
    const destTypes: string[] = Array.isArray(body.destTypes) ? body.destTypes : [];
    const destHint = typeof specificDestination === 'string' ? specificDestination.trim() : '';
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

    const systemPrompt = `You are Yatra Discovery Engine. Suggest exactly 4 Indian destinations for a trip from ${origin}.
${destHintLine}
Budget: ₹${targetBudget} total for ${party} people. Duration: ${nights} nights. Trip: ${tripType}. Language: ${language}.
${destFilter}

RULES:
- **Nearest Location First**: Prioritize destinations that are geographically closer to ${origin}.
- **Primary Transport**: Suggest **per-person** fares for both Flight and Train for the requested trip type (${tripType === 'round' ? 'ROUND-TRIP' : 'ONE-WAY'}).
- **Secondary Transport (Ferry/Bus/Road)**: If the destination requires a ferry or a long road journey (e.g., Alibaug, Havelock), include an "other_transport_cost" (**per-person**).
- **Hotel Pricing**: Suggest a **total price per night** for all ${party} people.
- **Total Estimate**: Calculate the total trip cost as: (Primary Transport × ${party}) + (Other Transport × ${party}) + (Hotel × ${nights}) + Taxi.
- **Budget Check**: The final total estimate for all ${party} people MUST be ≤ ₹${targetBudget}.
- If flights exceed budget, set flight_cost and budget_cost_estimate to "N/A".
- If destination name is ambiguous, set location_check to a short clarification question.
- Vary regions: do not repeat the same state for all 4.

Return ONLY a valid JSON array (no markdown fences) of exactly 4 objects:
[{
  "title": string,
  "destination": "City, State",
  "vibe": string,
  "why": string (1 sentence),
  "totalPrice": number (Total for ${party} people for ${nights} nights),
  "budget_cost_estimate": "₹X (flight total for ${party})",
  "budget_train_estimate": "₹X (train total for ${party})",
  "flight_cost": "₹X per person ${tripType === 'round' ? 'RT' : 'OW'}",
  "train_cost": "₹X per person ${tripType === 'round' ? 'RT' : 'OW'}",
  "other_transport_type": "Ferry" | "Bus" | "Road" | "None",
  "other_transport_cost": "₹X per person",
  "hotel_per_night": "₹X total for ${party}/night",
  "taxi_cost": "₹X total trip",
  "flight_name": string,
  "train_name": string,
  "hotel_name": string,
  "nearest_airport": string,
  "nearest_railway": string,
  "connectivity": string,
  "route_preview": string,
  "tags": [string],
  "caring_tip": string,
  "safety_score": string,
  "sustainability_hint": string,
  "location_check": ""
}]`;

    const result = await resilientGenerateContent(`Trips from ${origin}`, {
      useGrounding: true,
      systemPrompt,
      jsonMode: true
    });

    if (!result || !result.text) {
      throw new Error("Discovery Engine failed to generate travel cards.");
    }

    let suggestions: unknown[];
    try {
      suggestions = parseDiscoverySuggestionsJson(result.text);
    } catch (parseErr) {
      console.error("Discovery JSON parse failed:", parseErr, "\nSnippet:", result.text.slice(0, 800));
      throw parseErr instanceof Error ? parseErr : new Error(String(parseErr));
    }

    // --- BHASHINI OVERRIDE (If enabled) ---
    if (language !== 'en' && process.env.BHASHINI_API_KEY) {
      try {
        const { translateText } = await import("@/lib/bhashini");
        suggestions = await Promise.all(suggestions.map(async (s: any) => ({
          ...s,
          why: await translateText(s.why, 'en', language),
          title: await translateText(s.title, 'en', language),
          ...(typeof s.location_check === 'string' && s.location_check.trim()
            ? { location_check: await translateText(s.location_check, 'en', language) }
            : {}),
        })));
      } catch (e) { console.warn("Bhashini translation failed, using AI translation."); }
    }

    return NextResponse.json({ 
      success: true, 
      suggestions, 
      model: result.model,
      grounded: result.grounded
    });

  } catch (error: any) {
    console.error("Discovery Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
