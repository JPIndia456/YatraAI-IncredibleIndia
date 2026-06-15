import { NextResponse } from 'next/server';
import { resilientGenerateContent } from '@/lib/services/ai/resilience';
import { rateLimitOr429 } from '@/lib/security/apiRateLimit';

const MAX_PROMPT_CHARS = 8000;

export async function POST(req: Request) {
  try {
    const limited = rateLimitOr429(req, 'itinerary', 20, 60_000);
    if (limited) return limited;

    const { prompt } = await req.json();

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'A prompt is required.' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json({ success: false, error: 'Prompt is too long.' }, { status: 413 });
    }

    const result = await resilientGenerateContent(prompt, {
      jsonMode: true,
    });

    return NextResponse.json({
      success: true,
      response: result.text,
      model: result.model
    });
  } catch (error: unknown) {
    console.error('Itinerary API Error:', error);
    const message = error instanceof Error ? error.message : 'Itinerary generation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
