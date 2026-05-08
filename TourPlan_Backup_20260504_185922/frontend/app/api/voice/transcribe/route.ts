import { NextResponse } from 'next/server';
import { transcribeIndianVoice } from '@/lib/bhashini';

/** Planner / i18n UI codes → Bhashini ASR `sourceLanguage` codes */
const UI_LANG_TO_BHASHINI: Record<string, string> = {
  en: 'eng',
  hi: 'hin',
  ta: 'tam',
  te: 'tel',
  mr: 'mar',
  kn: 'kan',
  bn: 'ben',
  pa: 'pan',
  gu: 'guj',
  ml: 'mal',
};

export async function POST(req: Request) {
  if (!process.env.BHASHINI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          'Server voice is not configured. Set BHASHINI_API_KEY (and BHASHINI_USER_ID / BHASHINI_ORG_ID if required) in frontend/.env.local, then restart the dev server.',
      },
      { status: 503 },
    );
  }

  let body: { audioBase64?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let raw = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
  if (!raw) {
    return NextResponse.json({ error: 'Missing audioBase64' }, { status: 400 });
  }
  if (raw.includes(',')) {
    raw = raw.slice(raw.indexOf(',') + 1);
  }

  const uiLang = String(body.language || 'en').split('-')[0].toLowerCase();
  const bhashiniLang = UI_LANG_TO_BHASHINI[uiLang] ?? 'eng';

  const { text, detectedLang } = await transcribeIndianVoice(raw, bhashiniLang);
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return NextResponse.json(
      {
        error:
          'No speech detected in the recording. Speak closer to the mic, allow a longer clip, or try another language.',
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ text: trimmed, detectedLang });
}
