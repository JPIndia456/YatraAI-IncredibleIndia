import { NextResponse } from "next/server";
import { resilientGenerateContent } from "@/lib/services/ai/resilience";
import { parseDiscoverySuggestionsJson } from "@/lib/parseAiItineraryJson";

export const maxDuration = 60; // Extended timeout for Grounding & Bhashini

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, targetBudget, startDate, endDate, adults, kids = 0, language = 'en', specificDestination = '' } = body;
    // Defensive: rehydrated zustand state can produce a non-array for destTypes
    const destTypes: string[] = Array.isArray(body.destTypes) ? body.destTypes : [];
    const destHint = typeof specificDestination === 'string' ? specificDestination.trim() : '';
    const party = adults + kids;
    const destFilter = destTypes.length > 0 ? `ONLY suggest destinations matching: ${destTypes.join(', ')}.` : 'Suggest varied destinations across India.';
    const destHintLine = destHint ? `User prefers: "${destHint}". Include it or close matches.` : '';

    const systemPrompt = `You are TourPlan Discovery Engine. Suggest exactly 4 Indian destinations for a trip from ${origin}.
${destHintLine}
Budget: ₹${targetBudget} total for ${party} people. Dates: ${startDate}${endDate ? ` to ${endDate}` : ''}. Language: ${language}.
${destFilter}

RULES:
- All prices are ROUND-TRIP and for the ENTIRE party of ${party}.
- budget_cost_estimate (flight) and budget_train_estimate (train) must each be ≤ ₹${targetBudget}.
- If flights exceed budget, set flight_cost and budget_cost_estimate to "N/A".
- Train must always be cheaper than flight.
- If destination name is ambiguous, set location_check to a short clarification question.
- Vary regions: do not repeat the same state for all 4.

Return ONLY a valid JSON array (no markdown fences) of exactly 4 objects:
[{
  "title": string,
  "destination": "City, State",
  "vibe": string,
  "why": string (1 sentence),
  "budget_cost_estimate": "₹X (flight total)",
  "budget_train_estimate": "₹X (train total)",
  "flight_cost": "₹X per person RT",
  "train_cost": "₹X per person RT",
  "hotel_per_night": "₹X total/night",
  "taxi_cost": "₹X round trip",
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
      context: { targetBudget }
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
