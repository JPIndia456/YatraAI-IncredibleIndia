/** Rule-based hints before / alongside AI clarification for Indian trip routing. */

export type LocationIntelQuickSignal = {
  code: string;
  message: string;
  severity: 'info' | 'warn';
};

export type LocationIntelPayload = {
  success: true;
  clarification_needed: boolean;
  confidence: 'high' | 'medium' | 'low';
  friendly_summary: string;
  experience_tips: string[];
  clarifying_questions: Array<{ question: string; why_it_matters: string }>;
  suggested_origin: string | null;
  suggested_destination: string | null;
  quick_signals: LocationIntelQuickSignal[];
  weather?: { temp: string; condition: string };
};

export function collectQuickLocationSignals(origin: string, destination: string): LocationIntelQuickSignal[] {
  const signals: LocationIntelQuickSignal[] = [];
  const o = origin.trim();
  const d = destination.trim();
  const ol = o.toLowerCase();
  const dl = d.toLowerCase();

  if (o && d && ol === dl) {
    signals.push({
      code: 'same_od',
      message:
        'Origin and destination look identical — if that was accidental, swap fields or choose where you want to end your trip.',
      severity: 'warn',
    });
  }

  if (o.length > 0 && o.length < 3) {
    signals.push({
      code: 'short_origin',
      message: 'Use a full city name (e.g. “Mumbai” not “Mu”) so trains, flights and hotels geocode correctly.',
      severity: 'warn',
    });
  }

  if (d.length > 0 && d.length < 3) {
    signals.push({
      code: 'short_destination',
      message: 'Add a fuller destination name — short tokens often match the wrong place on booking APIs.',
      severity: 'warn',
    });
  }

  const typoAlibaug = /aliabug|alibuag/i;
  if (typoAlibaug.test(o) || typoAlibaug.test(d)) {
    signals.push({
      code: 'typo_alibaug',
      message:
        'Spelling looks like **Alibaug** (Maharashtra). Confirm if this is the Raigad coast — ferries use Gateway/Mandwa, not a station in town.',
      severity: 'info',
    });
  }

  const vagueDest =
    /^(beach|beaches|hill|hills|mountains|north|south|east|west|nearby|somewhere|anywhere|vacation|trip)\b/i.test(
      dl.trim(),
    ) && d.length < 28;
  if (vagueDest) {
    signals.push({
      code: 'vague_destination',
      message:
        'That reads like a theme, not a pin on the map — pick a named town or district so we can load real hotels and routes.',
      severity: 'warn',
    });
  }

  const vagueOrigin = /^(here|home|local|nearby)\b/i.test(ol) && o.length < 20;
  if (vagueOrigin) {
    signals.push({
      code: 'vague_origin',
      message:
        '“Here” or “nearby” is ambiguous — tell us which city you’re leaving from so budgets and distances stay accurate.',
      severity: 'warn',
    });
  }

  return signals;
}

export function quickSignalsFallbackPayload(
  origin: string,
  destination: string,
): LocationIntelPayload {
  const quick_signals = collectQuickLocationSignals(origin, destination);
  const warn = quick_signals.filter((s) => s.severity === 'warn').length;
  const clarification_needed = warn > 0;
  const friendly_summary =
    quick_signals.length === 0
      ? 'Your route looks clear enough to search — we’ll still cross-check live inventories.'
      : quick_signals.map((s) => s.message).join(' ');

  const clarifying_questions: LocationIntelPayload['clarifying_questions'] = [];
  if (/alibaug|alibag/i.test(destination + origin) || quick_signals.some((s) => s.code === 'typo_alibaug')) {
    clarifying_questions.push({
      question: 'Are you aiming for Alibaug town, Mandwa jetty side, or another Raigad beach (Varsoli, Kashid)?',
      why_it_matters: 'Sea crossings and hotel clusters differ — we tailor ferry vs road options accordingly.',
    });
  }
  if (warn > 0 && destination.length >= 3 && !vagueDestPattern(destination)) {
    clarifying_questions.push({
      question: `Is “${destination.trim()}” the exact spelling your maps app finds?`,
      why_it_matters: 'One letter often maps to a different state — confirming avoids wrong trains and stays.',
    });
  }

  return {
    success: true,
    clarification_needed,
    confidence: warn > 0 ? 'medium' : 'high',
    friendly_summary,
    experience_tips: [
      'Pick a named origin and destination — you’ll unlock more flight, hotel and ferry rows.',
      'If unsure, choose the nearest tier‑1 city you’d actually leave from (we’ll still suggest escapes nearby).',
    ],
    clarifying_questions,
    suggested_origin: typoAlibaugFix(origin),
    suggested_destination: typoAlibaugFix(destination),
    quick_signals,
  };
}

function vagueDestPattern(d: string): boolean {
  const dl = d.trim().toLowerCase();
  return /^(beach|beaches|hill|hills|mountains|north|south|east|west|nearby|somewhere|anywhere)\b/i.test(dl);
}

function typoAlibaugFix(s: string): string | null {
  if (/aliabug|alibuag/i.test(s)) return s.replace(/aliabug|alibuag/gi, 'Alibaug');
  return null;
}
