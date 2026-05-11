/**
 * Default Gemini model for @google/genai (live routes, gap-fill, location intel).
 * Google shut down `gemini-1.5-flash` on the consumer API; use 2.5 Flash or set GEMINI_MODEL.
 * Override in .env.local: GEMINI_MODEL=gemini-2.0-flash
 */
export const GEMINI_MODEL =
  (typeof process !== 'undefined' && process.env.GEMINI_MODEL?.trim()) || 'gemini-2.0-flash';

export const GEMINI_FLASH_CHAIN = [GEMINI_MODEL, "gemini-2.0-flash", "gemini-flash-latest"];
