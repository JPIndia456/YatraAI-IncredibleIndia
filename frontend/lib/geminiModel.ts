/**
 * Gemini model configuration.
 * Updated to gemini-2.5-flash (available on new API keys).
 * Override in .env.local: GEMINI_MODEL=gemini-2.5-flash
 */
export const GEMINI_MODEL =
  (typeof process !== 'undefined' && process.env.GEMINI_MODEL?.trim()) || 'gemini-2.5-flash';

// Grounded chain — supports Google Search grounding
export const GEMINI_FLASH_CHAIN = ["gemini-2.5-flash", "gemini-2.5-pro"];

// Plain chain — JSON mode / non-grounded (fastest to slowest)
export const GEMINI_PLAIN_CHAIN = ["gemini-2.5-flash", "gemini-2.5-pro"];
