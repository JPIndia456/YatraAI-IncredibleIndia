import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: Request) {
  try {
    const { origin, destination, startDate, endDate, travelType, transportMode, selectedOption } = await req.json();

    const dest = destination || '';
    const from = origin || '';
    const mode = transportMode || 'train';

    // ----------------------------------------------------
    // REAL GEMINI INTEGRATION
    // ----------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'YOUR_GEMINI_KEY') {
      try {
         const genAI = new GoogleGenerativeAI(apiKey);
         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

         const prompt = `
           You are an AI Travel Concierge for TourPlan. 
           Generate 3 categorized trip packages for:
           - From: ${from}
           - To: ${dest}
           - Transport: ${mode} (${selectedOption || 'Standard'})
           - Type: ${travelType}
           - Dates: ${startDate} to ${endDate}

           Output strictly in JSON list of length 3:
           [
             {
               "tier": "Economy", "icon": "💰", "tagline": "...", "color": "emerald",
               "transport": { "mode": "${mode}", "name": "...", "class": "...", "price": 0 },
               "hotel": { "name": "...", "type": "...", "pricePerNight": 0, "amenities": ["..."] },
               "meals": { "name": "...", "pricePerDay": 0 },
               "sightseeing": { "name": "...", "price": 0 },
               "totalPrice": 0
             },
             ... Medium, Premium ...
           ]
           Ensure prices are in INR (₹) and realistic for Indian travel.
           Medium should be roughly 2x Economy. Premium should be 5x Economy.
           ONLY return the JSON.
         `;

         const result = await model.generateContent(prompt);
         const response = await result.response;
         const text = response.text();
         
         const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
         const aiPackages = JSON.parse(cleanedJson);
         
         return NextResponse.json({
           success: true, route: { from, to: dest, startDate, endDate },
           travelType, transportMode: mode, selectedOption, packages: aiPackages
         });

      } catch (err) {
        console.error("Trip Package AI Error:", err);
      }
    }

    // No simulated fallback data per user request for a blank start
    return NextResponse.json({
      success: true,
      route: { from, to: dest, startDate, endDate },
      travelType,
      transportMode: mode,
      selectedOption,
      packages: []
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, 'Failed to generate trip packages') }, { status: 500 });
  }
}
