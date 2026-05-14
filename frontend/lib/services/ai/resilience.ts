import { callGroq } from "./groq";
import { callAnthropic } from "./anthropic";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL, GEMINI_FLASH_CHAIN } from "@/lib/geminiModel";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const IS_ANTHROPIC_READY = !!ANTHROPIC_KEY && !ANTHROPIC_KEY.includes("PASTE_YOUR");
// Gemini key must start with "AIzaSy" — any other format is invalid
const IS_GEMINI_READY = !!GEMINI_KEY && GEMINI_KEY.startsWith("AIzaSy");
const IS_GROQ_READY = !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("PASTE_YOUR");

const genAI = new GoogleGenerativeAI(IS_GEMINI_READY ? GEMINI_KEY : "dummy_key");

export async function resilientGenerateContent(prompt: string, options: {
  useGrounding?: boolean,
  systemPrompt?: string,
  image?: string, // Base64
  jsonMode?: boolean
} = {}) {
  const { useGrounding = false, systemPrompt = "", image, jsonMode = false } = options;
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Input: ${prompt}` : prompt;

  console.log(`🤖 AI Request: Grounding=${useGrounding}, JSON=${jsonMode}, PromptLen=${fullPrompt.length}`);

  // --- VISION MODE (image present → Gemini only) ---
  if (image && IS_GEMINI_READY) {
    for (const visionModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: visionModel,
          generationConfig: { maxOutputTokens: 4096 }
        });
        const result = await model.generateContent([
          fullPrompt,
          { inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } }
        ]);
        const response = await result.response;
        if (response.text()) {
          return { text: response.text(), model: `${visionModel}-vision` };
        }
      } catch (e: any) {
        console.warn(`Vision Error (${visionModel}):`, e.message);
      }
    }
  }

  // ── PRIORITY CHAIN ─────────────────────────────────────────────────────────
  // 1st: Gemini Flash (if grounding requested, use this primary)
  // 2nd: Groq Llama 3.3 (FREE, fast, primary for non-grounded chat)
  // 3rd: Anthropic via OpenRouter (premium fallback)
  // ──────────────────────────────────────────────────────────────────────────

  // 1️⃣  Gemini Flash — with Google Search grounding if requested
  // When useGrounding is true, we prioritize Gemini because it has native search
  if (IS_GEMINI_READY && useGrounding) {
    for (const geminiModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: geminiModel,
          generationConfig: { 
            maxOutputTokens: 8192,
            temperature: 0.1, // Lower temperature to reduce hallucinations
          }
        });
        const requestPayload = {
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          tools: [{ googleSearch: {} }] as any,
        };
        const result = await model.generateContent(requestPayload);
        const response = await result.response;
        if (response.text()) {
          return { text: response.text(), model: geminiModel, grounded: true };
        }
      } catch (e: any) {
        console.error(`🔴 Gemini Grounded [${geminiModel}] Error:`, e.message);
      }
    }
  }

  // 2️⃣  Groq — free tier, no grounding but excellent reasoning
  if (IS_GROQ_READY) {
    try {
      const text = await callGroq(fullPrompt, "llama");
      if (text) return { text, model: "groq-llama-3.3-70b", grounded: false };
    } catch (e: any) {
      console.warn("🔴 Primary (Groq) failed:", e.message);
    }
  }

  // 3️⃣  Gemini without Search — fallback when grounding fails, unsupported on key tier, or useGrounding false
  if (IS_GEMINI_READY) {
    for (const geminiModel of GEMINI_FLASH_CHAIN) {
      try {
        const model = genAI.getGenerativeModel({
          model: geminiModel,
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1, // Consistently low for travel data
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        if (response.text()) {
          return { text: response.text(), model: geminiModel, grounded: false };
        }
      } catch (e: any) {
        console.error(`🔴 Gemini Plain [${geminiModel}] Error:`, e.message);
      }
    }
  }

  // 3️⃣  Anthropic / OpenRouter — premium last resort
  if (IS_ANTHROPIC_READY) {
    try {
      const text = await callAnthropic(fullPrompt);
      if (text) return { text, model: "claude-3-5-sonnet", grounded: false };
    } catch (e: any) {
      console.error("🔴 Anthropic/OpenRouter Error:", e.message);
    }
  }

  // All engines failed — give actionable error
  const lastErr = "The AI discovery engine is currently overloaded or there is a connection issue.";
  console.error("❌ ALL AI ENGINES FAILED.");
  throw new Error(`${lastErr} Please wait a moment and try again.`);
}
