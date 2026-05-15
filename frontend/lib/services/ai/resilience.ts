import { callGroq } from "./groq";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";
import { callDeepSeek } from "./deepseek";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_FLASH_CHAIN, GEMINI_PLAIN_CHAIN } from "@/lib/geminiModel";

const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || "").trim();
const IS_ANTHROPIC_READY = !!ANTHROPIC_KEY && !ANTHROPIC_KEY.includes("PASTE_YOUR");
const IS_GEMINI_READY = !!GEMINI_KEY && GEMINI_KEY.startsWith("AIzaSy");
console.log(`[AI Resilience] Gemini Ready: ${IS_GEMINI_READY}, Key prefix: ${GEMINI_KEY.slice(0, 7)}...`);
const IS_GROQ_READY = !!(process.env.GROQ_API_KEY || "").trim() && !process.env.GROQ_API_KEY?.includes("PASTE_YOUR");

const genAI = new GoogleGenerativeAI(IS_GEMINI_READY ? GEMINI_KEY : "dummy_key");

const IS_OPENAI_READY = !!(process.env.OPENAI_API_KEY || "").trim() && !process.env.OPENAI_API_KEY?.includes("PASTE_YOUR");
const IS_DEEPSEEK_READY = !!(process.env.DEEPSEEK_API_KEY || "").trim() || !!(process.env.OPENROUTER_API_KEY || "").trim();

// ── Anti-hallucination disclaimer injected when live search is unavailable ────
const NO_LIVE_DATA_DISCLAIMER = `
CRITICAL CONSTRAINT — NO LIVE SEARCH AVAILABLE FOR THIS RESPONSE:
- Do NOT state specific prices, availability, schedules, or real-time data as confirmed fact.
- For any price or availability: say "Based on typical rates..." or "Last known estimate..."
- NEVER invent specific hotel names, flight numbers, train numbers, or exact prices.
- NEVER fabricate event dates, mela schedules, or local happenings.
- If unsure about a specific fact, say "I'd recommend verifying this directly" — do not guess.
`;

// ── Smart query classifier ─────────────────────────────────────────────────────
// Returns: 'fast' | 'standard' | 'grounded'
export function classifyQuery(text: string): 'fast' | 'standard' | 'grounded' {
  const t = text.toLowerCase().trim();

  // Fast path: short conversational messages (no grounding needed)
  const fastPatterns = [
    /^(hi|hello|hey|namaste|namaskar|jai hind|sat sri akaal|salaam)\b/,
    /^(thanks?|thank you|dhanyavaad|shukriya|thx)\b/,
    /^(ok|okay|got it|sure|understood|noted|great|nice|good|perfect|awesome|wonderful)\b/,
    /^(yes|no|yeah|yep|nope|of course|absolutely)\b/,
    /^(bye|goodbye|see you|farewell|alvida)\b/,
    /^.{0,30}$/, // Very short messages (< 30 chars) — likely conversational
  ];
  if (fastPatterns.some(p => p.test(t))) return 'fast';

  // Grounded path: needs live search data
  const groundedPatterns = [
    /price|cost|fare|rate|tariff|fee|charge|ticket|book/,
    /hotel|stay|resort|accommodation|hostel|lodge/,
    /flight|train|bus|taxi|cab|transport|travel|route/,
    /event|festival|mela|yatra|fair|celebration|concert/,
    /weather|temperature|monsoon|season|climate/,
    /distance|km|kilometer|hour.*drive|how far/,
    /visa|passport|permit|restricted|e-visa/,
    /restaurant|food|eat|cuisine|dine|dhaba/,
    /emergency|hospital|police|doctor|medical/,
    /itinerary|day.?plan|schedule|plan.*trip|trip.*plan/,
  ];
  if (groundedPatterns.some(p => p.test(t))) return 'grounded';

  return 'standard';
}

// ── Smart token budget based on query complexity ───────────────────────────────
export function getTokenBudget(queryType: 'fast' | 'standard' | 'grounded'): number {
  if (queryType === 'fast')     return 1024;
  if (queryType === 'standard') return 4096;
  return 16384; // grounded — needs space for detailed factual responses
}

// ── Per-call timeout helper (45s for Grounded Search) ─────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms = 45000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUE STREAMING — returns an AsyncGenerator that yields text tokens
// The route pipes this into a ReadableStream SSE response
// ─────────────────────────────────────────────────────────────────────────────
export async function* resilientStreamContent(
  prompt: string,
  options: {
    useGrounding?: boolean;
    systemPrompt?: string;
    tokenBudget?: number;
  } = {}
): AsyncGenerator<string> {
  const { useGrounding = false, systemPrompt = "", tokenBudget = 4096 } = options;
  const fullPrompt = `FACT-CHECKED MODE ENABLED. 
If grounding is active, use Google Search to verify all travel facts.
STRICT RULE: Never guess or hallucinate prices, flight times, or hotel details. If data is not available in search, admit it.
${systemPrompt ? `CONTEXT:\n${systemPrompt}\n\n` : ""}User Input: ${prompt}`;

  // 1️⃣ Groq fast path — lowest latency, no grounding overhead
  //    Always try for fast/standard queries if Gemini grounding not required
  if (IS_GROQ_READY && !useGrounding) {
    const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    for (const groqModel of groqModels) {
      try {
        const text = await withTimeout(callGroq(fullPrompt, groqModel), 12000);
        if (text) {
          // Simulate token streaming from Groq (no native streaming in current callGroq)
          // Emit in ~20-char chunks to give streaming feel
          const chunkSize = 20;
          for (let i = 0; i < text.length; i += chunkSize) {
            yield text.slice(i, i + chunkSize);
          }
          return;
        }
      } catch (e: any) {
        console.warn(`🟡 Groq [${groqModel}] stream failed:`, e.message);
      }
    }
  }

  // 2️⃣ Gemini Flash — with Google Search grounding (true token streaming)
  if (IS_GEMINI_READY && useGrounding) {
    for (const geminiModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModel,
          generationConfig: {
            maxOutputTokens: tokenBudget,
            temperature: 0.0,
            topP: 0.1,
            topK: 10,
          },
        });
        const requestPayload = {
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          tools: [{ googleSearch: {} }] as any,
        };
        const streamResult = await withTimeout(model.generateContentStream(requestPayload));
        for await (const chunk of streamResult.stream) {
          const token = chunk.text();
          if (token) yield token;
        }
        return;
      } catch (e: any) {
        console.error(`🔴 Gemini [Grounded Stream] ${geminiModel} failed:`, e.message, e.stack);
        break;
      }
    }
  }

  // 3️⃣ Gemini Plain — true token streaming, no grounding overhead
  if (IS_GEMINI_READY) {
    const groundedPrompt = useGrounding
      ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}`
      : fullPrompt;
    for (const geminiModel of GEMINI_PLAIN_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModel,
          generationConfig: {
            maxOutputTokens: Math.min(tokenBudget, 8192),
            temperature: 0.05,
            topP: 0.3,
          },
        });
        const streamResult = await withTimeout(
          model.generateContentStream(groundedPrompt),
          20000
        );
        for await (const chunk of streamResult.stream) {
          const token = chunk.text();
          if (token) yield token;
        }
        return;
      } catch (e: any) {
        console.warn(`🟡 Gemini [Plain Stream] ${geminiModel} failed:`, e.message);
      }
    }
  }

  // 3.5️⃣ ChatGPT Fallback (GPT-4o) — high reasoning
  if (IS_OPENAI_READY) {
    try {
      const text = await withTimeout(callOpenAI(fullPrompt), 20000);
      if (text) {
        const chunkSize = 25;
        for (let i = 0; i < text.length; i += chunkSize) {
          yield text.slice(i, i + chunkSize);
        }
        return;
      }
    } catch (e: any) {
      console.warn("🟡 OpenAI Stream failed:", e.message);
    }
  }

  // 4️⃣ Anthropic Claude — emit in chunks for streaming feel
  if (IS_ANTHROPIC_READY) {
    try {
      const groundedPrompt = useGrounding
        ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}`
        : fullPrompt;
      const text = await withTimeout(callAnthropic(groundedPrompt), 20000);
      if (text) {
        const chunkSize = 25;
        for (let i = 0; i < text.length; i += chunkSize) {
          yield text.slice(i, i + chunkSize);
        }
        return;
      }
    } catch (e: any) {
      console.error("🔴 Anthropic Stream Error:", e.message);
    }
  }

  // 4.5️⃣ DeepSeek Fallback — high value
  if (IS_DEEPSEEK_READY) {
    try {
      const text = await withTimeout(callDeepSeek(fullPrompt), 20000);
      if (text) {
        const chunkSize = 25;
        for (let i = 0; i < text.length; i += chunkSize) {
          yield text.slice(i, i + chunkSize);
        }
        return;
      }
    } catch (e: any) {
      console.warn("🟡 DeepSeek Stream failed:", e.message);
    }
  }

  // 5️⃣ Groq as final fallback even for grounded queries (with disclaimer)
  if (IS_GROQ_READY) {
    const groundedPrompt = useGrounding
      ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}`
      : fullPrompt;
    for (const groqModel of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
      try {
        const text = await withTimeout(callGroq(groundedPrompt, groqModel), 12000);
        if (text) {
          const chunkSize = 20;
          for (let i = 0; i < text.length; i += chunkSize) {
            yield text.slice(i, i + chunkSize);
          }
          return;
        }
      } catch (e: any) {
        console.warn(`🔴 Groq [Fallback] ${groqModel} failed:`, e.message);
      }
    }
  }

  yield "⚠️ All AI engines are currently unavailable. Please try again in a moment.";
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-STREAMING (batch) — kept for JSON/structured outputs
// ─────────────────────────────────────────────────────────────────────────────
export async function resilientGenerateContent(
  prompt: string,
  options: {
    useGrounding?: boolean;
    systemPrompt?: string;
    image?: string;
    jsonMode?: boolean;
  } = {}
) {
  const { useGrounding = false, systemPrompt = "", image, jsonMode = false } = options;
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Input: ${prompt}` : prompt;
  const fallbackPrompt = useGrounding
    ? `${systemPrompt}${NO_LIVE_DATA_DISCLAIMER}\n\nUser Input: ${prompt}`
    : fullPrompt;

  // Vision mode
  if (image && IS_GEMINI_READY) {
    for (const visionModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: visionModel,
          generationConfig: { maxOutputTokens: 4096 },
        });
        const result = await withTimeout(
          model.generateContent([
            fullPrompt,
            { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } },
          ])
        );
        const response = await result.response;
        if (response.text()) return { text: response.text(), model: `${visionModel}-vision`, grounded: false };
      } catch (e: any) {
        console.warn(`Vision Error (${visionModel}):`, e.message);
      }
    }
  }

  // Grounded Gemini
  if (IS_GEMINI_READY && useGrounding) {
    for (const geminiModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModel,
          generationConfig: { maxOutputTokens: 16384, temperature: 0.0, topP: 0.1, topK: 10 },
        });
        const result = await withTimeout(
          model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            tools: [{ googleSearch: {} }] as any,
          }),
          35000 // Grounded search gets more time
        );
        const response = await result.response;
        if (response.text()) return { text: response.text(), model: geminiModel, grounded: true };
      } catch (e: any) {
        console.error(`🔴 Gemini [Grounded] ${geminiModel} failed:`, e.message);
        break;
      }
    }
  }

  // Gemini Plain
  if (IS_GEMINI_READY) {
    for (const geminiModel of GEMINI_PLAIN_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModel,
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.05,
            topP: 0.3,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        });
        const groundedPrompt = useGrounding ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}` : fullPrompt;
        const result = await withTimeout(model.generateContent(groundedPrompt), 15000); // Fallbacks must be fast
        const response = await result.response;
        if (response.text()) return { text: response.text(), model: geminiModel, grounded: false };
      } catch (e: any) {
        console.error(`🔴 Gemini [Plain] ${geminiModel} failed:`, e.message);
      }
    }
  }

  // 2.5️⃣ ChatGPT Fallback
  if (IS_OPENAI_READY) {
    try {
      const text = await withTimeout(callOpenAI(fallbackPrompt));
      if (text) return { text, model: "gpt-4o", grounded: false };
    } catch (e: any) {
      console.error("🔴 OpenAI Error:", e.message);
    }
  }

  // 3️⃣ Anthropic
  if (IS_ANTHROPIC_READY) {
    try {
      const text = await withTimeout(callAnthropic(useGrounding ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}` : fullPrompt));
      if (text) return { text, model: "claude-3-5-sonnet-20241022", grounded: false };
    } catch (e: any) {
      console.error("🔴 Anthropic Error:", e.message);
    }
  }

  // 3.5️⃣ DeepSeek Fallback
  if (IS_DEEPSEEK_READY) {
    try {
      const text = await withTimeout(callDeepSeek(fallbackPrompt));
      if (text) return { text, model: "deepseek-chat", grounded: false };
    } catch (e: any) {
      console.error("🔴 DeepSeek Error:", e.message);
    }
  }

  // Groq
  if (IS_GROQ_READY) {
    for (const groqModel of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
      try {
        const text = await withTimeout(
          callGroq(useGrounding ? `${NO_LIVE_DATA_DISCLAIMER}\n\n${fullPrompt}` : fullPrompt, groqModel),
          12000
        );
        if (text) return { text, model: `groq-${groqModel}`, grounded: false };
      } catch (e: any) {
        console.warn(`🔴 Groq [${groqModel}] failed:`, e.message);
      }
    }
  }

  throw new Error("All AI engines are currently unavailable. Please try again in a moment.");
}
