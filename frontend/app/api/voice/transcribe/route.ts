import { NextResponse } from 'next/server';

/** UI lang codes → Sarvam BCP-47 */
const UI_LANG_TO_SARVAM: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
  mr: 'mr-IN', kn: 'kn-IN', bn: 'bn-IN', pa: 'pa-IN',
  gu: 'gu-IN', ml: 'ml-IN', ur: 'ur-IN', or: 'or-IN',
};

/** UI lang codes → Bhashini 3-letter codes (fallback) */
const UI_LANG_TO_BHASHINI: Record<string, string> = {
  en: 'eng', hi: 'hin', ta: 'tam', te: 'tel',
  mr: 'mar', kn: 'kan', bn: 'ben', pa: 'pan',
  gu: 'guj', ml: 'mal',
};

export async function POST(req: Request) {
  const sarvamKey  = process.env.SARVAM_API_KEY?.trim();
  const bhashiniKey = process.env.BHASHINI_API_KEY?.trim();

  if (!sarvamKey && !bhashiniKey) {
    return NextResponse.json(
      { error: 'Voice STT not configured. Set SARVAM_API_KEY in .env.local and restart the server.' },
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
  if (!raw) return NextResponse.json({ error: 'Missing audioBase64' }, { status: 400 });
  if (raw.includes(',')) raw = raw.slice(raw.indexOf(',') + 1);

  const uiLang = String(body.language || 'en').split('-')[0].toLowerCase();

  // ── 1. Sarvam STT (Primary) ──────────────────────────────────────────────
  if (sarvamKey) {
    try {
      const sarvamLang = UI_LANG_TO_SARVAM[uiLang] ?? 'hi-IN';

      // Sarvam expects multipart/form-data with a .wav file blob
      const audioBuffer = Buffer.from(raw, 'base64');
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'saarika:v2');
      formData.append('language_code', sarvamLang);
      formData.append('with_timestamps', 'false');

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': sarvamKey },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const text = (result?.transcript || '').trim();
        if (text) {
          return NextResponse.json({ text, detectedLang: sarvamLang, engine: 'sarvam' });
        }
      } else {
        const err = await response.text();
        console.warn('[Sarvam STT] Non-OK response:', response.status, err);
      }
    } catch (e: any) {
      console.warn('[Sarvam STT] Failed, trying Bhashini fallback:', e.message);
    }
  }

  // ── 2. Bhashini STT (Fallback) ────────────────────────────────────────────
  if (bhashiniKey) {
    try {
      const { transcribeIndianVoice } = await import('@/lib/bhashini');
      const bhashiniLang = UI_LANG_TO_BHASHINI[uiLang] ?? 'eng';
      const { text, detectedLang } = await transcribeIndianVoice(raw, bhashiniLang);
      const trimmed = (text || '').trim();
      if (trimmed) {
        return NextResponse.json({ text: trimmed, detectedLang, engine: 'bhashini' });
      }
    } catch (e: any) {
      console.error('[Bhashini STT] Failed:', e.message);
    }
  }

  return NextResponse.json(
    { error: 'No speech detected. Speak clearly, closer to the mic, or try again.' },
    { status: 422 },
  );
}
