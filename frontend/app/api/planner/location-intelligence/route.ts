export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  collectQuickLocationSignals,
  quickSignalsFallbackPayload,
  type LocationIntelPayload,
} from '@/lib/locationIntelligence';
import { GEMINI_MODEL } from '@/lib/geminiModel';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

function parseIntelJson(text: string): Record<string, unknown> | null {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeQuestions(raw: unknown): LocationIntelPayload['clarifying_questions'] {
  if (!Array.isArray(raw)) return [];
  const out: LocationIntelPayload['clarifying_questions'] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const q = String((row as any).question || '').trim();
    const w = String((row as any).why_it_matters || (row as any).why || '').trim();
    if (q) out.push({ question: q, why_it_matters: w || 'Helps maps and OTAs resolve the right place.' });
  }
  return out.slice(0, 5);
}

function mergeAiIntel(ai: Record<string, unknown>, base: LocationIntelPayload): LocationIntelPayload {
  const tips = ai.experience_tips;
  const mergedTips =
    Array.isArray(tips) && tips.length > 0
      ? tips.map((x) => String(x)).filter(Boolean)
      : base.experience_tips;

  const cq = normalizeQuestions(ai.clarifying_questions);
  const mergedQuestions = cq.length > 0 ? cq : base.clarifying_questions;

  const so = ai.suggested_origin != null ? String(ai.suggested_origin).trim() : '';
  const sd = ai.suggested_destination != null ? String(ai.suggested_destination).trim() : '';

  return {
    ...base,
    clarification_needed: Boolean(ai.clarification_needed) || base.clarification_needed,
    confidence:
      ai.confidence === 'high' || ai.confidence === 'medium' || ai.confidence === 'low'
        ? ai.confidence
        : base.confidence,
    friendly_summary:
      typeof ai.friendly_summary === 'string' && ai.friendly_summary.trim()
        ? ai.friendly_summary.trim()
        : base.friendly_summary,
    experience_tips: mergedTips,
    clarifying_questions: mergedQuestions,
    suggested_origin: so || base.suggested_origin,
    suggested_destination: sd || base.suggested_destination,
    weather: ai.weather ? { 
      temp: String((ai.weather as any).temp || ''), 
      condition: String((ai.weather as any).condition || '') 
    } : undefined,
  };
}

export async function POST(req: Request) {
  let origin = '';
  let destination = '';
  try {
    const limited = rateLimitOr429(req, 'location-intelligence', 40, 60_000);
    if (limited) return limited;

    const body = await req.json();
    origin = String(body.origin || '');
    destination = String(body.destination || '');
    const language = String(body.language || 'en');

    const base = quickSignalsFallbackPayload(origin, destination);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'dummy_key') {
      return NextResponse.json(base);
    }

    const quick = collectQuickLocationSignals(origin, destination);
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You assist Yatra, an Indian domestic trip planner.

USER LANGUAGE PREFERENCE: ${language}

RAW ORIGIN: "${origin.trim()}"
RAW DESTINATION (may be empty): "${destination.trim()}"

SYSTEM RULE FLAGS (trust these facts): ${JSON.stringify(quick)}

Tasks:
1) If origin or destination could map to multiple real Indian places, or spelling is likely wrong, set clarification_needed true and write helpful clarifying_questions (short, respectful).
2) Always include experience_tips: 2–4 concise bullets on how the traveller gets MORE meaningful choices (named cities, approximate area, ferry vs rail vs road where relevant).
3) suggested_origin / suggested_destination: only when you can confidently normalize an obvious typo or spell-out (otherwise use empty string "").
4) weather: Include a brief current weather snapshot for the DESTINATION if known (temp in Celsius and condition like "Cloudy", "Sunny", "Raining").

Return ONLY JSON (no markdown):
{
  "clarification_needed": boolean,
  "confidence": "high"|"medium"|"low",
  "friendly_summary": "max 2 sentences",
  "experience_tips": ["...", "..."],
  "clarifying_questions": [{"question":"...","why_it_matters":"..."}],
  "suggested_origin": "",
  "suggested_destination": "",
  "weather": { "temp": "28°C", "condition": "Sunny" }
}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.2 },
    });

    const parsed = parseIntelJson(response.text ?? '');
    if (!parsed) {
      return NextResponse.json(base);
    }

    return NextResponse.json(mergeAiIntel(parsed, base));
  } catch (err: unknown) {
    console.warn('[location-intelligence]', err);
    return NextResponse.json(quickSignalsFallbackPayload(origin, destination));
  }
}
