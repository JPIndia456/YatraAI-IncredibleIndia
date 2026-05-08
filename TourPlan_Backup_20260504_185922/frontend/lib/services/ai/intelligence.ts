import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import * as railway from "@/indian-railways-mcp/src/railwayService";
import { GoogleFlightsService } from "@/lib/services/flights/googleFlightsService";
import { TripAdvisorService } from "@/lib/services/tripadvisor/tripadvisorService";
import { BookingService } from "@/lib/services/booking/bookingService";
import { getDestinationFromCache, upsertCachedReport } from "@/lib/services/destinations";
import { bhashiniTools, executeBhashiniTool } from "@/indian-bhashini-mcp/src/index";
import { GEMINI_MODEL } from '@/lib/geminiModel';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_prevent_crash");
const genAINew = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });

export interface IntelligenceContext {
  userId?: string;
  uiLanguage?: string;
  userName?: string;
  history?: any[];
  destination?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  origin?: string;
  // TripPlanner context
  selectedPlan?: {
    tierLabel: string;
    from: string;
    to: string;
    total: string;
    nights?: number;
    transport?: { name: string; price: string; label: string };
    hotel?: { name: string; price: string; label: string };
    local?: { name: string; price: string; label: string };
  };
  tripTiers?: Array<{ label: string; total: string; transport: any; hotel: any; local: any }>;
  plannerSearchData?: { trains?: any[]; flights?: any[]; hotels?: any[]; buses?: any[]; taxis?: any[] };
}

const tools = [
  {
    functionDeclarations: [
      {
        name: "getPnrStatus",
        description: "Get real-time PNR status for an Indian Railways booking.",
        parameters: {
          type: "OBJECT",
          properties: {
            pnrNumber: { type: "STRING", description: "The 10-digit PNR number." }
          },
          required: ["pnrNumber"]
        }
      },
      {
        name: "searchTrains",
        description: "Search for trains between two Indian stations on a date.",
        parameters: {
          type: "OBJECT",
          properties: {
            from: { type: "STRING", description: "Source station code (e.g., BCT, NDLS)." },
            to: { type: "STRING", description: "Destination station code (e.g., MAS, SBC)." },
            date: { type: "STRING", description: "Date in DD-MM-YYYY format." }
          },
          required: ["from", "to", "date"]
        }
      },
      {
        name: "searchFlights",
        description: "Search for real-time flight offers using Google Flights (via MCP).",
        parameters: {
          type: "OBJECT",
          properties: {
            origin: { type: "STRING", description: "Origin IATA code (e.g., BOM, DEL)." },
            destination: { type: "STRING", description: "Destination IATA code (e.g., MAA, BLR)." },
            date: { type: "STRING", description: "Departure date (YYYY-MM-DD)." },
            adults: { type: "NUMBER", description: "Number of adults." }
          },
          required: ["origin", "destination", "date"]
        }
      },
      {
        name: "checkPriceTrend",
        description: "Analyze historical price trends for a specific travel route (e.g. Mumbai to Delhi) to advise the user on the best time to book.",
        parameters: {
          type: "OBJECT",
          properties: {
            from: { type: "STRING" },
            to: { type: "STRING" }
          },
          required: ["from", "to"]
        }
      },
      {
        name: "getDestinationKnowledge",
        description: "Look up curated AI intelligence and historical travel knowledge for a specific Indian city or destination.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "The name of the Indian city or destination (e.g., Srinagar, Mumbai, Hampi)" }
          },
          required: ["location"]
        }
      },
      {
        name: "getUserProfile",
        description: "Fetch the user's personal travel preferences, style, and account details to provide personalized responses.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "getUserBookings",
        description: "Retrieve the current user's past and upcoming travel bookings, tickets, and reservations.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "getUserNotifications",
        description: "Check for any recent travel alerts, price drops, or system notifications for the current user.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "getEnvironmentalData",
        description: "Get real-time AQI (Air Quality) and Weather data for any Indian city to advise on health and safety.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "City name e.g. Delhi, Mumbai" }
          },
          required: ["location"]
        }
      },
      {
        name: "searchHotels",
        description: "Search for hotels in a specific city or location using TripAdvisor.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "The city or destination name (e.g., Jaipur, Munnar)" },
            checkin: { type: "STRING", description: "Check-in date (YYYY-MM-DD)" },
            checkout: { type: "STRING", description: "Check-out date (YYYY-MM-DD)" }
          },
          required: ["location"]
        }
      },
      {
        name: "searchRestaurants",
        description: "Search for top-rated restaurants in a specific city using TripAdvisor.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "The city or destination name" }
          },
          required: ["location"]
        }
      },
      {
        name: "searchAttractions",
        description: "Search for popular tourist attractions and things to do in a specific city using TripAdvisor.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "The city or destination name" }
          },
          required: ["location"]
        }
      },
      {
        name: "searchCarRentals",
        description: "Search for car rentals and taxi services in a specific city using Booking.com.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "The city or destination name" },
            pickupDate: { type: "STRING", description: "Pick-up date (YYYY-MM-DD)" },
            pickupTime: { type: "STRING", description: "Pick-up time (HH:MM)" },
            dropoffDate: { type: "STRING", description: "Drop-off date (YYYY-MM-DD)" },
            dropoffTime: { type: "STRING", description: "Drop-off time (HH:MM)" }
          },
          required: ["location"]
        }
      },
      ...bhashiniTools
    ],
  },
  {
    googleSearchRetrieval: {}
  }
];

const SYSTEM_PROMPT = `You are TripTourPlan, the intelligence backbone of the Yatra App.
You provide precise, culturally sensitive, and expert Indian travel advice.
Key Attributes:
- Multilingual (supports all 22 Indian languages via Bhashini).
- Trip Planning: Focus on Pilgrimage, Mountains, Beaches, Wildlife, and Heritage.
- Detailed Breakdown: Always consider Budget (tier-specific), Safety (solo-safe), Timing (2026 accurate), and Accessibility.
- Environmental Awareness: Be proactive about AQI and Weather. If a user plans to visit a city with high pollution (e.g., Delhi in winter) or extreme weather (monsoon in Mumbai), warn them and suggest alternatives.
- Local First: Recommend Indian carriers (IndiGo, Air India), IRCTC trains, and local hidden gems. Mention ONDC for local cabs and food when relevant.
- Ethical: Suggest sustainable options (trains over short flights, eco-hotels).
- Heritage Expert: Always check for local holiday/monument timings (e.g. Dry days, Fridays for Taj Mahal).
- Integrated: You have tools for PNR status, live train/flight searches, environmental data, destination intelligence, and global data from TripAdvisor and Booking.com for hotels, restaurants, car rentals, and attractions.
- Use TripAdvisor/Booking.com tools (searchHotels, searchRestaurants, searchAttractions, searchCarRentals) when the user asks for recommendations or real-time availability of stays, dining, and transport.
- Always be polite and use "Namaste".`;

/**
 * Unified Intelligence Engine
 * Handles tool calling and reasoning for both Frontend Chat and Telegram.
 */
export async function runIntelligence(text: string, context: IntelligenceContext) {
  const model = genAI.getGenerativeModel({ 
    model: GEMINI_MODEL,
    tools: tools as any
  });

  const chat = model.startChat({
    history: context.history || []
  });

  // Build TripPlanner context block
  let plannerContext = '';
  if (context.selectedPlan) {
    const p = context.selectedPlan;
    plannerContext = `

🗺️ ACTIVE TRIP PLAN (user has selected this plan):
- Route: ${p.from} → ${p.to}
- Plan Tier: ${p.tierLabel}
- Total Estimate: ${p.total}
- Nights: ${p.nights || 'N/A'}
- Transport: ${p.transport?.name || 'N/A'} (${p.transport?.price || ''})
- Hotel: ${p.hotel?.name || 'N/A'} (${p.hotel?.price || ''}/night)
- Local Transport: ${p.local?.name || 'N/A'} (${p.local?.price || ''})
If the user asks about their trip, refer to this plan specifically.`;
  } else if (context.tripTiers?.length) {
    const tierSummary = context.tripTiers.map(t =>
      `  • ${t.label}: ${t.total} (${t.transport?.name || 'train'} + ${t.hotel?.name || 'hotel'} + ${t.local?.name || 'cab'})`
    ).join('\n');
    plannerContext = `

📊 TRIP PLAN COMPARISON (user has NOT selected a plan yet):
Route: ${context.origin || 'Origin'} → ${context.destination || 'Destination'}
${tierSummary}
You can help the user decide which plan suits their needs.`;
  }

  if (context.plannerSearchData) {
    const d = context.plannerSearchData;
    if (d.trains?.length) plannerContext += `\nAvailable trains: ${d.trains.slice(0, 3).map((t: any) => `${t.name} (${t.price})`).join(', ')}`;
    if (d.flights?.length) plannerContext += `\nAvailable flights: ${d.flights.slice(0, 3).map((f: any) => `${f.airline} ${f.flight} (${f.price})`).join(', ')}`;
    if (d.hotels?.length) plannerContext += `\nAvailable hotels: ${d.hotels.slice(0, 3).map((h: any) => `${h.name} (${h.price}/night)`).join(', ')}`;
  }

  const prompt = `${SYSTEM_PROMPT}\n\nContext: ${JSON.stringify({ 
      user: context.userName, 
      lang: context.uiLanguage,
      destination: context.destination,
      origin: context.origin,
      tripDates: `${context.tripStartDate || ''}${context.tripEndDate ? ' to ' + context.tripEndDate : ''}`,
  })}${plannerContext}\n\nUser Message: ${text}`;

  try {
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const calls = response.functionCalls();

    const toolOutputs: any[] = [];
    if (calls && calls.length > 0) {
      for (const call of calls) {
        try {
          if (call.name === "getPnrStatus") {
            const data = await railway.getPnrStatus((call.args as any).pnrNumber);
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "searchTrains") {
            const { from, to, date } = call.args as any;
            const data = await railway.getTrainsOnDate(from, to, date);
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "searchFlights") {
            // Use RapidAPI
            let data = await GoogleFlightsService.searchFlightsOneWay(call.args as any);
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "getUserProfile") {
            if (!context.userId) throw new Error("Authentication required to check profile");
            const { data } = await supabaseAdmin.from('tourplan_profiles').select('*').eq('user_id', context.userId).single();
            toolOutputs.push({ functionResponse: { name: call.name, response: { profile: data || null } } });
          } else if (call.name === "getUserBookings") {
            if (!context.userId) throw new Error("Authentication required to check bookings");
            const { data } = await supabaseAdmin.from('tourplan_bookings').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
            toolOutputs.push({ functionResponse: { name: call.name, response: { bookings: data || [] } } });
          } else if (call.name === "getUserNotifications") {
            if (!context.userId) throw new Error("Authentication required to check notifications");
            const { data } = await supabaseAdmin.from('tourplan_notifications').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(5);
            toolOutputs.push({ functionResponse: { name: call.name, response: { notifications: data || [] } } });
          } else if (call.name === "checkPriceTrend") {
            const { from, to } = call.args as any;
            const { data } = await supabaseAdmin.from('tourplan_price_checks').select('*').ilike('route', `%${from}%`).ilike('route', `%${to}%`).order('created_at', { ascending: false }).limit(10);
            toolOutputs.push({ functionResponse: { name: call.name, response: { history: data || [] } } });
          } else if (call.name === "getDestinationKnowledge") {
            const { location } = call.args as any;
            const cache = await getDestinationFromCache(location);
            toolOutputs.push({ functionResponse: { name: call.name, response: { 
              found: !!cache,
              knowledge: cache?.cached_report || "No specific cached intelligence found for this location. Proceed with general knowledge."
            } } });
          } else if (["transcribeVoice", "detectAndTranscribe", "translateIndianText", "speakText"].includes(call.name)) {
            const data = await executeBhashiniTool(call.name, call.args);
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "getEnvironmentalData") {
            const { location } = call.args as any;
            // Import dynamically to avoid circular issues
            const { EnvironmentalService } = await import('@/lib/services/location/environmentalService');
            const data = await EnvironmentalService.getRealTimeData(location);
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "searchHotels") {
            const { location, checkin, checkout } = call.args as any;
            
            // Try TripAdvisor first
            const tripLoc = await TripAdvisorService.searchLocation(location);
            let hotels: any[] = [];
            if (tripLoc?.location_id) {
              hotels = await TripAdvisorService.searchHotels(tripLoc.location_id, checkin, checkout);
            }

            // Fallback to or supplement with Booking.com
            if (hotels.length === 0) {
              const bookLoc = await BookingService.searchDestination(location);
              if (bookLoc?.dest_id) {
                const bookData = await BookingService.searchHotels({
                  dest_id: bookLoc.dest_id,
                  dest_type: bookLoc.dest_type,
                  checkin_date: checkin || new Date().toISOString().split('T')[0],
                  checkout_date: checkout || new Date(Date.now() + 86400000).toISOString().split('T')[0]
                });
                hotels = bookData?.result || [];
              }
            }
            
            toolOutputs.push({ functionResponse: { name: call.name, response: { hotels } } });
          } else if (call.name === "searchCarRentals") {
            const { location, pickupDate, pickupTime, dropoffDate, dropoffTime } = call.args as any;
            const bookLoc = await BookingService.searchDestination(location);
            if (bookLoc?.latitude && bookLoc?.longitude) {
              const data = await BookingService.searchCarRentals({
                pick_up_latitude: bookLoc.latitude,
                pick_up_longitude: bookLoc.longitude,
                drop_off_latitude: bookLoc.latitude,
                drop_off_longitude: bookLoc.longitude,
                pick_up_date: pickupDate || new Date().toISOString().split('T')[0],
                pick_up_time: pickupTime || "10:00",
                drop_off_date: dropoffDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
                drop_off_time: dropoffTime || "10:00"
              });
              toolOutputs.push({ functionResponse: { name: call.name, response: { rentals: data } } });
            } else {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "Location coordinates not found" } } });
            }
          } else if (call.name === "searchRestaurants") {
            const { location } = call.args as any;
            const loc = await TripAdvisorService.searchLocation(location);
            if (loc?.location_id) {
              const data = await TripAdvisorService.searchRestaurants(loc.location_id);
              toolOutputs.push({ functionResponse: { name: call.name, response: { restaurants: data } } });
            } else {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "Location not found" } } });
            }
          } else if (call.name === "searchAttractions") {
            const { location } = call.args as any;
            const loc = await TripAdvisorService.searchLocation(location);
            if (loc?.location_id) {
              const data = await TripAdvisorService.searchAttractions(loc.location_id);
              toolOutputs.push({ functionResponse: { name: call.name, response: { attractions: data } } });
            } else {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "Location not found" } } });
            }
          }
        } catch (toolError) {
          console.error(`Tool Execution Error (${call.name}):`, toolError);
          toolOutputs.push({ functionResponse: { name: call.name, response: { error: "Service temporarily unavailable" } } });
        }
      }
    }

    if (toolOutputs.length > 0) {
      const finalResult = await chat.sendMessage(toolOutputs);
      return finalResult.response.text();
    }

    return response.text();
  } catch (err) {
    console.error("Gemini Real-time Intelligence Error:", err);
    // Return a rich, travel-specific mock response for the TourPlan Brain Brain
    const isHindi = context.uiLanguage === 'hi';
    const destination = context.destination || 'India';
    
    if (text.toLowerCase().includes('train') || text.toLowerCase().includes('flight')) {
      return isHindi 
        ? `नमस्ते! वर्तमान में मेरी लाइव बुकिंग सेवा सीमित है। हालाँकि, ${destination} के लिए कई ट्रेनें (जैसे शताब्दी, राजधानी) और उड़ानें (IndiGo, Air India) उपलब्ध हैं। आप हमारे बुकिंग सेक्शन में वास्तविक समय की उपलब्धता देख सकते हैं।`
        : `Namaste! My live booking lookup is temporarily limited. However, for ${destination}, there are several trains (Shatabdi, Rajdhani) and flights (IndiGo, Air India) currently operating. You can check live status in our Bookings section.`;
    }
    
    return isHindi
      ? `नमस्ते! मैं आपका यात्राAI सलाहकार हूँ। मैं आपको ${destination} के बारे में जानकारी देने और एक शानदार भारतीय सांस्कृतिक यात्रा की योजना बनाने में मदद कर सकता हूँ। आप मुझसे क्या पूछना चाहेंगे?`
      : `Namaste! I am your TourPlan concierge. I can help you with insights about ${destination} and planning a grand Indian cultural odyssey. What would you like to explore?`;
  }
}

/**
 * Get Structured Travel Intelligence Report
 */
export async function getIntelligenceReport(category: string, location: string, language: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // 1. Check Supabase cache first — instant response if already fetched
  const cachedData = await getDestinationFromCache(location);
  if (cachedData?.cached_report) {
    console.log(`[Intelligence] Serving from cache for: ${location}`);
    return cachedData.cached_report;
  }

  if (apiKey && apiKey !== 'YOUR_GEMINI_KEY' && apiKey !== 'dummy_key') {
    try {
      // 2. Use NEW Gemini SDK with Google Search Grounding for real-time web data
      const groundingTool = { googleSearch: {} };

      const prompt = `You are TourPlan's travel intelligence engine. 
Search the web RIGHT NOW and generate a REAL, CURRENT travel intelligence report for: **${location}**, India.
Category focus: ${category} traveler. Language: ${language}.

You MUST search for current, real places, restaurants, experiences and transport in ${location}.
Do NOT use generic descriptions. Everything must be SPECIFIC to ${location}.

Return ONLY raw JSON (no markdown, no code blocks) in this exact structure:
{
  "culinary": [{"name": "Actual place/dish name", "desc": "Specific description with real details"}],
  "heritage": [{"name": "Real landmark", "desc": "Historical facts and visiting info"}],
  "vibe": [{"name": "Real neighbourhood/experience", "desc": "What makes it unique right now"}],
  "transport": [{"name": "Specific local transport", "desc": "How locals actually travel here"}],
  "night": [{"name": "Real night spot/experience", "desc": "Current nightlife or evening scene"}],
  "nature": [{"name": "Real natural site or park", "desc": "What to experience in nature here"}]
}
Exactly 3 items per pillar. Only real, verified places in ${location}.`;

      const response = await genAINew.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          tools: [groundingTool as any],
          temperature: 0.3,
        }
      });

      const outputText = response.text ?? '';
      
      // Strict JSON cleaning
      let cleanedJson = outputText.trim();
      if (cleanedJson.includes('```')) {
        cleanedJson = cleanedJson.split(/```(?:json)?/)[1]?.split('```')[0]?.trim() || cleanedJson;
      }
      
      // Strip any leading/trailing non-JSON text
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedJson = cleanedJson.slice(jsonStart, jsonEnd + 1);
      }

      const report = JSON.parse(cleanedJson);
      
      // 3. Persist to cache for instant future loads
      if (location && report && typeof report === 'object') {
        await upsertCachedReport(location, report);
        console.log(`[Intelligence] Cached web-grounded report for: ${location}`);
      }
      
      return report;

    } catch (err) {
      console.error(`[Intelligence] Google Search Grounding failed for ${location}:`, err);
      // Fall through to curated data
    }
  }

  // 4. Curated data fallback (no API key or all above failed)
  return getCuratedFallback(location);
}

/** 
 * Hand-curated fallback data for major Indian destinations.
 * Used when Gemini API is unavailable. Keyed by lowercase city name.
 */
function getCuratedFallback(location: string): Record<string, { name: string; desc: string }[]> {
  const loc = location.toLowerCase().trim();

  // No specific city fallbacks per user request for a blank start
  // Generic Indian city fallback — uses location name dynamically
  return {
    culinary: [
      { name: `Local Street Food of ${location}`, desc: 'A diverse range of regional specialties — spices, flavors and textures unique to this destination.' },
      { name: 'Traditional Thali Experience', desc: `A complete meal showcasing the culinary identity of ${location} — rice, lentils, sabzi and regional breads.` },
      { name: 'Regional Sweet Shop', desc: 'Indigenous mithai and desserts crafted from centuries-old family recipes.' }
    ],
    heritage: [
      { name: `Historic Old Quarter of ${location}`, desc: 'The oldest part of the city — ancient temples, step wells and heritage havelis.' },
      { name: 'Regional Archaeological Museum', desc: 'Artefacts spanning 5000 years of civilizational history of this region.' },
      { name: 'Colonial-Era Architecture', desc: 'British-era administrative buildings and church structures blended with Indian craftsmanship.' }
    ],
    vibe: [
      { name: 'Main Bazaar Experience', desc: `The beating commercial heart of ${location} — textiles, spices and seasonal produce.` },
      { name: 'Regional Arts & Craft District', desc: 'Artisans practicing traditional crafts passed down across generations.' },
      { name: 'Local Chai & Culture', desc: 'Chaiwallas, newspaper readers and morning conversations — the real India.' }
    ],
    transport: [
      { name: 'City Auto Rickshaw', desc: 'Nimble three-wheelers navigating every lane. Quintessential Indian urban transport.' },
      { name: 'State Road Transport Bus', desc: 'Extensive network connecting all neighborhoods and surrounding areas affordably.' },
      { name: 'Railway Station Hub', desc: `${location} railway station connects you to all major Indian cities via Indian Railways.` }
    ],
    night: [
      { name: `${location} Night Bazaar`, desc: 'Street vendors, food stalls and cultural performances after sunset.' },
      { name: 'Riverside Promenade', desc: 'The riverfront lit up at dusk — families, couples and evening walkers.' },
      { name: 'Heritage Site After Dark', desc: 'The illuminated monuments take on an ethereal glow as darkness falls.' }
    ],
    nature: [
      { name: 'Regional National Park or Reserve', desc: 'Indigenous wildlife sanctuaries within reach of the city limits.' },
      { name: 'Riverside & Waterways', desc: 'Sacred rivers, ghats and water bodies woven into the city\'s soul.' },
      { name: `Viewpoint Above ${location}`, desc: 'Hilltop temples or observation decks offer sweeping panoramas of city and countryside.' }
    ]
  };
}
