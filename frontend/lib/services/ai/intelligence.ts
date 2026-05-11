import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDestinationFromCache, upsertCachedReport } from "@/lib/services/destinations";
import { bhashiniTools, executeBhashiniTool } from "@/indian-bhashini-mcp/src/index";
import { GEMINI_MODEL } from '@/lib/geminiModel';
import * as railway from "@/indian-railways-mcp/src/railwayService";
import { TripAdvisorService } from "@/lib/services/tripadvisor/tripadvisorService";
import { AmadeusService } from "@/lib/services/travel/amadeus";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeJsonText } from "@/lib/parseAiItineraryJson";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_prevent_crash");

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
  userPersona?: string;
  likes?: string[];
  dislikes?: string[];
  targetBudget?: number;
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

      ...bhashiniTools
    ],
  },
  {
    googleSearchRetrieval: {}
  }
];

const SYSTEM_PROMPT = `You are TripYatra, the "Gold Standard" intelligence Travel Guide for the Yatra AI platform.
You provide precise, warm, and culturally authentic Indian travel guidance.

Core Directives:
1. **Authentic Indian Persona**: Embody the spirit of "Atithi Devo Bhava" (The Guest is God). You are not a robot; you are a hospitable, enthusiastic, and highly knowledgeable Indian travel expert. 
2. **Natural Conversational Flow**: Use a warm, human tone. Use respectful Indian honorifics (Ji, Sahab) and common local idioms where they fit naturally (e.g., "paisa-vasool," "Shubh Yatra," "Chai-pe-charcha"). 
3. **"Hand-in-Hand" Guidance**: You are proactive. If you see a user has a trip planned, check the weather, AQI, and local events for those specific dates and offer advice WITHOUT being asked.
4. **Multilingual Mastery**: You fluently use all 22 Indian languages via Bhashini. Always greet with "Namaste" or regional equivalents (Vanakkam, Sat Sri Akal).
5. **Consistency & Conciseness**: Maintain the exact same level of detail, tone, and conciseness across all languages. If a response is brief in English, it must be equally brief in Hindi, Marathi, etc.
6. **Local Intelligence**: Favor Indian carriers (IndiGo, Air India), IRCTC Vande Bharat/Shatabdi trains, and ONDC-integrated services. Deeply understand local nuances (e.g., temple timings, dry days, or the best time for the Ganga Aarti).
7. **Environmental Intelligence**: Monitor AQI and Weather in real-time. If conditions are hazardous, suggest "Escape to the Hills" alternatives immediately.
8. **Budget-Aware Discovery**: When suggesting new options via the \`[DISCOVERY: ...]\` tag (e.g., hotels, transport), you MUST calculate the **TOTAL cost** for the entire party and duration. 
   - For **stays/hotels**: Total = (Price per night) × (Number of nights) × (Number of rooms needed).
   - For **transport/flights/trains**: Total = (Price per person **ROUND-TRIP**) × (Total passengers). 
   - ALWAYS ensure the **TOTAL suggested price** is within a +/- ₹5,000 range of the user's current plan or target budget. Never suggest options that exceed the user's total budget.
9. **Proximity Prioritization**: Prioritize "Nearest Location First." If the user is in Mumbai, favor Pune, Lonavala, or Alibaug over far-away destinations unless they specifically ask for long-distance travel.
10. **Discovery Tag Format**: Use this exact format: \`[DISCOVERY: type=stay name=Place_Name price=₹Total_Value stars=Num features=Detail_1_Detail_2 link=URL]\`. The \`price\` MUST be the **calculated total** for the entire trip (including return fares for transport). Use underscores for spaces in attribute values.

Operational Flow:
- When the user message arrives, check the 'ACTIVE TRIP PLAN' or 'TRIP PLAN COMPARISON' in the context first.
- Use your tools (searchFlights, searchTrains, searchHotels) to provide real-time data instead of generic placeholders.
- **Strict Language Requirement**: You MUST respond in the language specified by 'lang' in the Context block. Maintain linguistic parity; do not become more verbose just because the language changed. 
- Avoid robotic preamble (e.g., "As an AI, I can help you..."). Dive straight into the helpful, warm conversation.
- Always end with a proactive question that moves the "Odyssey" forward.`;

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
      persona: context.userPersona || 'Cultural Explorer',
      likes: context.likes || [],
      dislikes: context.dislikes || [],
      targetBudget: context.targetBudget || 25000
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
            // Use AmadeusService (Simulation supported)
            const { origin, destination, date, adults = 1 } = call.args as any;
            const data = await AmadeusService.searchFlights({ origin, destination, date, adults });
            toolOutputs.push({ functionResponse: { name: call.name, response: { data } } });
          } else if (call.name === "getUserProfile") {
            if (!context.userId) {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "User not linked. Please share your contact in Telegram first." } } });
              continue;
            }
            const { data } = await supabaseAdmin.from('yatra_profiles').select('*').eq('user_id', context.userId).single();
            toolOutputs.push({ functionResponse: { name: call.name, response: { profile: data || null } } });
          } else if (call.name === "getUserBookings") {
            if (!context.userId) {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "User not linked. No bookings found. Please share contact first." } } });
              continue;
            }
            const { data } = await supabaseAdmin.from('yatra_bookings').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
            toolOutputs.push({ functionResponse: { name: call.name, response: { bookings: data || [] } } });
          } else if (call.name === "getUserNotifications") {
            if (!context.userId) {
              toolOutputs.push({ functionResponse: { name: call.name, response: { error: "User not linked. Notifications unavailable." } } });
              continue;
            }
            const { data } = await supabaseAdmin.from('yatra_notifications').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(5);
            toolOutputs.push({ functionResponse: { name: call.name, response: { notifications: data || [] } } });
          } else if (call.name === "checkPriceTrend") {
            const { from, to } = call.args as any;
            const { data } = await supabaseAdmin.from('yatra_price_checks').select('*').ilike('route', `%${from}%`).ilike('route', `%${to}%`).order('created_at', { ascending: false }).limit(10);
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
            
            // Use AmadeusService (Simulation supported)
            const hotels = await AmadeusService.searchHotels({ 
              location, 
              checkIn: checkin, 
              checkOut: checkout, 
              guests: 1 
            });

            toolOutputs.push({ functionResponse: { name: call.name, response: { hotels } } });

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
    // Return a rich, travel-specific mock response for the Yatra AI Brain
    const lang = context.uiLanguage || 'en';
    const dest = context.destination || 'India';
    
    const messages: Record<string, { booking: string; general: string }> = {
      en: {
        booking: `Namaste! My live booking lookup is temporarily limited. However, for ${dest}, there are several trains (Shatabdi, Rajdhani) and flights (IndiGo, Air India) currently operating. You can check live status in our Bookings section.`,
        general: `Namaste! I am your Yatra AI Travel Guide. I can help you with insights about ${dest} and planning a grand Indian cultural odyssey. What would you like to explore?`
      },
      hi: {
        booking: `नमस्ते! वर्तमान में मेरी लाइव बुकिंग सेवा सीमित है। हालाँकि, ${dest} के लिए कई ट्रेनें (जैसे शताब्दी, राजधानी) और उड़ानें (IndiGo, Air India) उपलब्ध हैं। आप हमारे बुकिंग सेक्शन में वास्तविक समय की उपलब्धता देख सकते हैं।`,
        general: `नमस्ते! मैं आपका यात्राAI सलाहकार हूँ। मैं आपको ${dest} के बारे में जानकारी देने और एक शानदार भारतीय सांस्कृतिक यात्रा की योजना बनाने में मदद कर सकता हूँ। आप मुझसे क्या पूछना चाहेंगे?`
      },
      mr: {
        booking: `नमस्ते! सध्या माझी लाइव्ह बुकिंग सेवा मर्यादित आहे. तथापि, ${dest} साठी अनेक गाड्या (उदा. शताब्दी, राजधानी) आणि उड्डाणे (IndiGo, Air India) कार्यरत आहेत. आपण आमच्या बुकिंग विभागात रिअल-टाइम उपलब्धता तपासू शकता.`,
        general: `नमस्ते! मी तुमचा यात्राAI सल्लागार आहे. मी तुम्हाला ${dest} बद्दल माहिती देण्यात आणि एक शानदार भारतीय सांस्कृतिक सहल नियोजित करण्यात मदत करू शकतो. तुम्हाला काय जाणून घ्यायला आवडेल?`
      },
      gu: {
        booking: `નમસ્તે! હાલમાં મારી લાઈવ બુકિંગ સેવા મર્યાદિત છે. જોકે, ${dest} માટે ઘણી ટ્રેનો (જેમ કે શતાબ્દી, રાજધાની) અને ફ્લાઈટ્સ (IndiGo, Air India) ઉપલબ્ધ છે. તમે અમારા બુકિંગ વિભાગમાં રીઅલ-ટાઇમ ઉપલબ્ધતા ચકાસી શકો છો.`,
        general: `નમસ્તે! હું તમારો યાત્રાAI સલાહકાર છું. હું તમને ${dest} વિશે માહિતી આપવા અને એક ભવ્ય ભારતીય સાંસ્કૃતિક પ્રવાસનું આયોજન કરવામાં મદદ કરી શકું છું. તમે શું જાણવા માંગો છો?`
      },
      kn: {
        booking: `ನಮಸ್ತೆ! ಪ್ರಸ್ತುತ ನನ್ನ ಲೈವ್ ಬುಕಿಂಗ್ ಸೇವೆ ಸೀಮಿತವಾಗಿದೆ. ಆದಾಗ್ಯೂ, ${dest} ಗಾಗಿ ಹಲವಾರು ರೈಲುಗಳು (ಶತಾಬ್ದಿ, ರಾಜಧಾನಿಯಂತಹ) ಮತ್ತು ವಿಮಾನಗಳು (IndiGo, Air India) ಲಭ್ಯವಿವೆ. ನಮ್ಮ ಬುಕಿಂಗ್ ವಿಭಾಗದಲ್ಲಿ ನೀವು ನೈಜ-ಸಮಯದ ಲಭ್ಯತೆಯನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.`,
        general: `ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ ಯಾತ್ರಾAI ಸಲಹೆಗಾರ. ನಾನು ನಿಮಗೆ ${dest} ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡಲು ಮತ್ತು ಭವ್ಯವಾದ ಭಾರತೀಯ ಸಾಂಸ್ಕೃತಿಕ ಪ್ರವಾಸವನ್ನು ಯೋಜಿಸಲು ಸಹಾಯ ಮಾಡಬಹುದು. ನೀವು ಏನನ್ನು ಅನ್ವೇಷಿಸಲು ಬಯಸುತ್ತೀರಿ?`
      },
      bn: {
        booking: `নমস্তে! বর্তমানে আমার লাইভ বুকিং পরিষেবা সীমিত। তবে, ${dest}-এর জন্য বেশ কিছু ট্রেন (যেমন শতাব্দী, রাজধানী) এবং ফ্লাইট (IndiGo, Air India) চালু রয়েছে। আপনি আমাদের বুকিং বিভাগে রিয়েল-টাইম প্রাপ্যতা পরীক্ষা করতে পারেন।`,
        general: `নমস্তে! আমি আপনার যাত্রাAI পরামর্শদাতা। আমি আপনাকে ${dest} সম্পর্কে তথ্য দিতে এবং একটি দুর্দান্ত ভারতীয় সাংস্কৃতিক ভ্রমণের পরিকল্পনা করতে সহায়তা করতে পারি। আপনি কি জানতে চান?`
      },
      te: {
        booking: `నమస్తే! ప్రస్తుతం నా లైవ్ బుకింగ్ సేవ పరిమితంగా ఉంది. అయితే, ${dest} కోసం అనేక రైళ్లు (శతాబ్ది, రాజధాని వంటివి) మరియు విమానాలు (IndiGo, Air India) అందుబాటులో ఉన్నాయి. మీరు మా బుకింగ్ విభాగంలో రియల్ టైమ్ లభ్యతను తనిఖీ చేయవచ్చు.`,
        general: `నమస్తే! నేను మీ యాత్రాAI సలహాదారుని. నేను మీకు ${dest} గురించి సమాచారాన్ని అందించడంలో మరియు అద్భుతమైన భారతీయ సాంస్కృతిక ప్రయాణాన్ని ప్లాన్ చేయడంలో సహాయపడగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?`
      },
      ml: {
        booking: `നമസ്തേ! നിലവിൽ എന്റെ ലൈവ് ബുക്കിംഗ് സേവനം പരിമിതമാണ്. എന്നിരുന്നാലും, ${dest} ലേക്ക് നിരവധി ട്രെയിനുകളും (ശതാബ്ദി, രാജധാനി പോലുള്ളവ) വിമാനങ്ങളും (IndiGo, Air India) ലഭ്യമാണ്. ഞങ്ങളുടെ ബുക്കിംഗ് വിഭാഗത്തിൽ നിങ്ങൾക്ക് തത്സമയ ലഭ്യത പരിശോധിക്കാവുന്നതാണ്.`,
        general: `നമസ്തേ! ഞാൻ നിങ്ങളുടെ യാത്രാAI ഉപദേശകനാണ്. ${dest} നെക്കുറിച്ചുള്ള വിവരങ്ങൾ നൽകാനും മികച്ചൊരു ഇന്ത്യൻ സാംസ്കാരിക യാത്ര ആസൂത്രണം ചെയ്യാനും എനിക്ക് നിങ്ങളെ സഹായിക്കാനാകും. നിങ്ങൾക്ക് എന്താണ് അറിയേണ്ടത്?`
      },
      ta: {
        booking: `வணக்கம்! தற்போது எனது நேரடி முன்பதிவு சேவை குறைவாக உள்ளது. இருப்பினும், ${dest}-க்கு பல ரயில்கள் (சதாப்தி, ராஜதானி போன்றவை) மற்றும் விமானங்கள் (IndiGo, Air India) இயக்கப்படுகின்றன. எங்கள் முன்பதிவு பிரிவில் நேரடி நிலையை நீங்கள் சரிபார்க்கலாம்.`,
        general: `வணக்கம்! நான் உங்கள் யாத்ராAI ஆலோசகர். ${dest} பற்றிய தகவல்களை வழங்கவும், ஒரு சிறந்த இந்திய கலாச்சாரப் பயணத்தைத் திட்டமிடவும் நான் உங்களுக்கு உதவ முடியும். நீங்கள் எதை ஆராய விரும்புகிறீர்கள்?`
      }
    };

    const msgSet = messages[lang] || messages.en;
    if (text.toLowerCase().includes('train') || text.toLowerCase().includes('flight')) {
      return msgSet.booking;
    }
    return msgSet.general;
  }
}

/**
 * Get Structured Travel Intelligence Report
 */
export async function getEnvironmentalStats() {
  // Mock data for production hardening
  return {
    aqi: 45,
    status: "Good",
    weather: "Sunny, 28°C"
  };
}

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
      const prompt = `You are Yatra's travel intelligence engine. 
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

      const result = await genAI.getGenerativeModel({ model: GEMINI_MODEL }).generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] as any
      });

      const text = result.response.text();
      const sanitized = sanitizeJsonText(text.replace(/```json/g, '').replace(/```/g, ''));
      const report = JSON.parse(sanitized);
      
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
