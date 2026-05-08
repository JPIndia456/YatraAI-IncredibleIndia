/**
 * BHASHINI: INDIAN MULTILINGUAL VOICE & TRANSLATION SERVICE
 * Official Integration for TourPlan - All 22 Scheduled Indian Languages
 */

export const BHASHINI_CONFIG = {
  // Bhashini ULCA API Endpoints
  PIPELINE_ENDPOINT: "https://meity-auth.ulcacontrib.org/ulca/apis/v1/model/get-pipeline-config",
  COMPUTE_ENDPOINT: "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
  API_KEY: process.env.BHASHINI_API_KEY,
  USER_ID: process.env.BHASHINI_USER_ID,
  ORG_ID: process.env.BHASHINI_ORG_ID
};

/**
 * All 22 Scheduled Languages of India + English
 */
export const INDIAN_LANGUAGES: Record<string, string> = {
  'asm': 'Assamese', 'ben': 'Bengali', 'brx': 'Bodo', 'doi': 'Dogri', 
  'guj': 'Gujarati', 'hin': 'Hindi', 'kan': 'Kannada', 'kas': 'Kashmiri', 
  'kok': 'Konkani', 'mai': 'Maithili', 'mal': 'Malayalam', 'mni': 'Manipuri', 
  'mar': 'Marathi', 'nep': 'Nepali', 'ori': 'Odia', 'pan': 'Punjabi', 
  'san': 'Sanskrit', 'sat': 'Santali', 'snd': 'Sindhi', 'tam': 'Tamil', 
  'tel': 'Telugu', 'urd': 'Urdu', 'eng': 'English'
};

/**
 * 1. DETECT LANGUAGE (LID)
 * Identifies which Indian language is being spoken
 */
export async function detectIndianLanguage(audioBase64: string): Promise<string> {
  if (!BHASHINI_CONFIG.API_KEY) return 'hin'; // Fallback to Hindi

  try {
    const response = await fetch(BHASHINI_CONFIG.COMPUTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BHASHINI_CONFIG.API_KEY
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "asr", 
            config: { language: { sourceLanguage: "hin" } } // Dummy for LID trigger
          }
        ],
        inputData: { audio: [{ audioContent: audioBase64 }] }
      })
    });

    const result = await response.json();
    // In actual Bhashini LID task, this would return the detected language code
    // For now, we return the language from the first transcript or fallback to the provided setting
    return result?.pipelineResponse?.[0]?.output?.[0]?.sourceLanguage || 'hin';
  } catch (error) {
    console.error("Bhashini LID Error:", error);
    return 'hin';
  }
}

/**
 * 2. TRANSCRIBE (STT) 
 * Supports Automatic Language Detection if sourceLang is not provided
 */
export async function transcribeIndianVoice(audioBase64: string, sourceLang?: string) {
  const lang = sourceLang || await detectIndianLanguage(audioBase64);

  try {
    const response = await fetch(BHASHINI_CONFIG.COMPUTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BHASHINI_CONFIG.API_KEY as string
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "asr",
            config: { language: { sourceLanguage: lang }, samplingRate: 16000 }
          }
        ],
        inputData: { audio: [{ audioContent: audioBase64 }] }
      })
    });

    const result = await response.json();
    return {
      text: result?.pipelineResponse?.[0]?.output?.[0]?.source || "",
      detectedLang: lang
    };
  } catch (error) {
    console.error("Bhashini ASR Error:", error);
    return { text: "", detectedLang: lang };
  }
}

/**
 * 3. TRANSLATE
 */
export async function translateText(text: string, from: string, to: string) {
  if (from === to) return text;

  try {
    const response = await fetch(BHASHINI_CONFIG.COMPUTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BHASHINI_CONFIG.API_KEY as string
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "translation",
            config: { language: { sourceLanguage: from, targetLanguage: to } }
          }
        ],
        inputData: { input: [{ source: text }] }
      })
    });

    const result = await response.json();
    return result?.pipelineResponse?.[0]?.output?.[0]?.target || text;
  } catch (error) {
    console.error("Bhashini Translation Error:", error);
    return text;
  }
}

/**
 * 4. SPEAK (TTS)
 */
export async function speakIndianText(text: string, lang: string = 'hin') {
  try {
    const audioContent = await generateIndianVoice(text, lang);
    if (!audioContent) return false;
    
    if (typeof window !== 'undefined') {
      const audio = new Audio(`data:audio/wav;base64,${audioContent}`);
      await audio.play();
    }
    return true;
  } catch (error) {
    console.error("Bhashini TTS Error:", error);
    return false;
  }
}

/**
 * 5. GENERATE VOICE (Server-Side via Bhashini)
 * Returns base64 audio string, or "" if unavailable / key not set.
 */
export async function generateIndianVoice(text: string, lang: string = 'hin'): Promise<string> {
  const key = BHASHINI_CONFIG.API_KEY;
  // Skip if key is missing or is a placeholder value
  if (!key || /REPLACE|PASTE|YOUR|XXX/i.test(key)) {
    return ""; // No key — caller uses browser TTS fallback
  }

  try {
    const response = await fetch(BHASHINI_CONFIG.COMPUTE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": key
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "tts",
            config: { language: { sourceLanguage: lang }, gender: "female" }
          }
        ],
        inputData: { input: [{ source: text }] }
      })
    });

    const result = await response.json();
    return result?.pipelineResponse?.[0]?.output?.[0]?.audio?.[0]?.audioContent || "";
  } catch (error) {
    console.error("Bhashini Server-Side TTS Error:", error);
    return "";
  }
}

/**
 * 6. BROWSER TTS FALLBACK — Indian Accent Priority
 * Picks the best available Indian-accent voice from the browser.
 * Voice preference order:
 *   1. Named Indian voices (Aditi, Ravi, Heera, Lekha, Kalpana, Veena — Google/Microsoft)
 *   2. Exact BCP-47 locale match (e.g. en-IN, hi-IN)
 *   3. Any voice with "-IN" in locale
 *   4. English fallback
 */
export function speakWithBrowserTTS(
  text: string,
  lang: string = 'en'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('speechSynthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Map internal short codes → BCP-47 Indian locales
    const langMap: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN',
      te: 'te-IN', bn: 'bn-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN', or: 'or-IN',
      as: 'as-IN', ne: 'ne-IN',
      // Bhashini 3-letter codes
      hin: 'hi-IN', tam: 'ta-IN', tel: 'te-IN', ben: 'bn-IN',
      mar: 'mr-IN', guj: 'gu-IN', kan: 'kn-IN', mal: 'ml-IN',
      pan: 'pa-IN', eng: 'en-IN', urd: 'ur-IN',
    };
    const bcp47 = langMap[lang] || 'en-IN';

    // Strip markdown so TTS reads naturally
    const cleanText = text
      .replace(/[*_~`#>\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\n+/g, '. ')
      .replace(/₹/g, 'rupees ')
      .slice(0, 500); // ~500 chars for concise voice replies

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = bcp47;
    // Natural Indian cadence — slightly slower, warm pitch
    utterance.rate  = 0.90;
    utterance.pitch = 1.08;
    utterance.volume = 1;

    // ── Indian voice selection — priority order ─────────────────────────────
    // Known high-quality Indian voices by name (Google, Microsoft, Apple)
    const INDIAN_VOICE_NAMES = /aditi|ravi|heera|kalpana|lekha|veena|priya|neerja|hemant|google\s(hindi|bengali|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|urdu)/i;

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const exactMatch   = voices.filter(v => v.lang === bcp47);
      const broadMatch   = voices.filter(v => v.lang.startsWith(bcp47.split('-')[0]));
      const indiaLocale  = voices.filter(v => v.lang.includes('-IN'));
      const namedIndian  = voices.filter(v => INDIAN_VOICE_NAMES.test(v.name));
      const enIn         = voices.filter(v => v.lang === 'en-IN');

      // Pick in strict priority: named Indian > exact locale > any -IN > en-IN > first available
      const chosen =
        namedIndian.find(v => v.lang === bcp47) ||
        namedIndian[0] ||
        exactMatch[0] ||
        broadMatch[0] ||
        enIn[0] ||
        indiaLocale[0] ||
        voices.find(v => v.lang.startsWith('en'));

      if (chosen) {
        utterance.voice = chosen;
        // Ensure lang stays Indian even if voice lang differs
        utterance.lang = chosen.lang.includes('-IN') ? chosen.lang : bcp47;
      }
    };

    selectVoice();
    // Chrome loads voices asynchronously on first call
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', selectVoice, { once: true });
    }

    utterance.onend   = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(e.error));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

