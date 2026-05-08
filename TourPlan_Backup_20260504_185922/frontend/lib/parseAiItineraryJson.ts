/**
 * Extract and parse itinerary JSON from LLM output (markdown fences, prose, minor syntax noise).
 */

/** First complete `{ ... }` object respecting strings and escapes (not naive lastIndexOf `}`). */
export function extractBalancedJsonObject(src: string): string | null {
  const start = src.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < src.length; i++) {
    const c = src[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }

  return null;
}

/** First top-level `[ ... ]` array (respects strings; handles nested `[` inside objects). */
export function extractBalancedJsonArray(src: string): string | null {
  const unfenced = stripMarkdownFence(src.trim());
  const start = unfenced.indexOf('[');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < unfenced.length; i++) {
    const c = unfenced[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return unfenced.slice(start, i + 1);
    }
  }

  return null;
}

function stripMarkdownFence(text: string): string {
  let t = text.trim();
  if (!t.startsWith('```')) return t;
  const firstNl = t.indexOf('\n');
  const close = t.lastIndexOf('```');
  if (firstNl !== -1 && close > firstNl) {
    return t.slice(firstNl + 1, close).trim();
  }
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/** Normalize common LLM JSON slip-ups before JSON.parse */
export function sanitizeJsonText(json: string): string {
  let s = json;
  // Smart quotes → ASCII (often breaks parse at “highlight” positions)
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  // Trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Illegal JSON literals models sometimes emit
  s = s.replace(/\bNaN\b/g, 'null');
  s = s.replace(/\bInfinity\b/g, 'null');
  s = s.replace(/\bundefined\b/g, 'null');
  return s.trim();
}

export function parseAiItineraryJson(raw: string): Record<string, unknown> {
  const unfenced = stripMarkdownFence(raw);
  let slice = extractBalancedJsonObject(unfenced);
  if (!slice) {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('AI response was not in a valid format');
    }
    slice = unfenced.slice(start, end + 1);
  }

  slice = sanitizeJsonText(slice);

  try {
    const parsed = JSON.parse(slice);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('AI returned non-object JSON');
    }
    return parsed as Record<string, unknown>;
  } catch (first) {
    // Second pass: only structural commas (riskier fixes removed)
    try {
      const again = sanitizeJsonText(slice.replace(/,\s*([}\]])/g, '$1'));
      const parsed = JSON.parse(again);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw first;
      }
      return parsed as Record<string, unknown>;
    } catch {
      const msg = first instanceof Error ? first.message : String(first);
      throw new Error(
        `Could not parse itinerary JSON: ${msg}. Try confirming again — if it persists, pick another suggestion or shorten the trip details.`,
      );
    }
  }
}

/** Parse discovery `/api/discovery` AI output: markdown fences, prose, then a JSON array of cards. */
export function parseDiscoverySuggestionsJson(raw: string): unknown[] {
  const slice = extractBalancedJsonArray(raw);
  if (!slice) {
    throw new Error('Discovery Engine returned an invalid format. Please try again.');
  }
  const sanitized = sanitizeJsonText(slice);
  try {
    const parsed = JSON.parse(sanitized);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Discovery Engine returned no suggestions.');
    }
    return parsed;
  } catch (first) {
    try {
      const again = sanitizeJsonText(slice.replace(/,\s*([}\]])/g, '$1'));
      const parsed = JSON.parse(again);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw first;
      }
      return parsed;
    } catch {
      const msg = first instanceof Error ? first.message : String(first);
      throw new Error(`Could not parse discovery JSON: ${msg}`);
    }
  }
}
