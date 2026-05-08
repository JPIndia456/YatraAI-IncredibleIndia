/**
 * Shared parse utilities for the AI planner wizard.
 * The planner page imports these to define its WizardField schema.
 */

import { ddMmYyyyToIso, isoDateToDdMmYyyy } from '@/lib/dateFormat';

/** Parse a budget string into a number: "30k" → 30000, "1 lakh" → 100000, "₹75,000" → 75000 */
export function parseBudget(text: string): number {
  const t = text.toLowerCase().replace(/[,₹ ]/g, '');
  if (t.match(/^\d+$/)) return parseInt(t);
  const lakhMatch = t.match(/([0-9.]+)\s*l/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);
  const kMatch = t.match(/([0-9.]+)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const numMatch = t.match(/([0-9]+)/);
  if (numMatch) return parseInt(numMatch[1]);
  return 30000;
}

/** Parse a natural language date into YYYY-MM-DD */
export function parseDate(text: string): string {
  const trimmed = text.trim();
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) return trimmed;
  const fromDmy = ddMmYyyyToIso(trimmed);
  if (fromDmy) return fromDmy;
  const now = new Date();
  const t = text.toLowerCase();
  if (t.includes('today')) return now.toISOString().split('T')[0];
  if (t.includes('tomorrow')) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
  }
  if (t.includes('this weekend') || t.includes('saturday')) {
    const d = new Date(now); const day = d.getDay();
    d.setDate(d.getDate() + (6 - day)); return d.toISOString().split('T')[0];
  }
  if (t.includes('next week')) {
    const d = new Date(now); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
  }
  if (t.includes('next month')) {
    const d = new Date(now); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0];
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  const d = new Date(now); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
}

/** Parse adult count from text: "solo" / "business traveler" → 1, "couple" → 2, "3" → 3, "5+" → 5 */
export function parseAdults(text: string): number {
  const t = text.toLowerCase().trim();
  if (t.includes('couple') || t.includes('two of us') || t.trim() === '2') return 2;
  if (t.match(/^(3|three)$/)) return 3;
  if (t.match(/^(4|four)$/)) return 4;
  if (t.match(/^(5|five)/) || t.includes('5+')) return 5;

  const digitsOnly = t.replace(/[^0-9]/g, '');
  const explicitNum = digitsOnly.length ? parseInt(digitsOnly, 10) : NaN;

  const soloPhrases =
    t.includes('just me') ||
    t.includes('solo') ||
    t.includes('myself') ||
    t.includes('only me') ||
    t.includes('on my own') ||
    t.includes('traveling alone') ||
    t.includes('travelling alone') ||
    t.includes('alone ') ||
    t.endsWith('alone') ||
    t.includes('by myself');
  const businessSoloPhrases =
    t.includes('business traveler') ||
    t.includes('business traveller') ||
    t.includes('business travel') ||
    t.includes('business trip') ||
    t.includes('work trip') ||
    t.includes('work travel') ||
    t.includes('for work') ||
    t.includes('corporate travel');

  if (soloPhrases || businessSoloPhrases) {
    if (!isNaN(explicitNum) && explicitNum >= 1) return Math.min(20, explicitNum);
    return 1;
  }

  if (t.trim() === '1') return 1;
  return isNaN(explicitNum) ? 2 : Math.max(1, Math.min(20, explicitNum));
}

/** Generate chips for departure date: this weekend, next week, etc. */
export function getStartDateChips() {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const weekend = new Date(now);
  const day = weekend.getDay();
  weekend.setDate(weekend.getDate() + (6 - day) + (day === 6 ? 7 : 0));
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const twoWeeks = new Date(now); twoWeeks.setDate(now.getDate() + 14);
  const nextMonth = new Date(now); nextMonth.setMonth(now.getMonth() + 1); nextMonth.setDate(1);
  return [
    { label: `This Sat · ${isoDateToDdMmYyyy(fmt(weekend))}`, value: fmt(weekend) },
    { label: `Next week · ${isoDateToDdMmYyyy(fmt(nextWeek))}`, value: fmt(nextWeek) },
    { label: `2 weeks · ${isoDateToDdMmYyyy(fmt(twoWeeks))}`, value: fmt(twoWeeks) },
    { label: `Next month · ${isoDateToDdMmYyyy(fmt(nextMonth))}`, value: fmt(nextMonth) },
  ];
}

/** Generate return-date chips based on departure: 3N, 5N, 7N, 10N */
export function getEndDateChips(startDateStr?: string) {
  const base = startDateStr ? new Date(startDateStr) : new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return [3, 5, 7, 10].map(nights => {
    const d = new Date(base); d.setDate(d.getDate() + nights);
    return { label: `${nights} nights · ${isoDateToDdMmYyyy(fmt(d))}`, value: fmt(d) };
  });
}

/** Parse a 10-digit phone number from text */
export function parsePhone(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/** Parse trip type: "one-way", "round-trip", "single", etc. */
export function parseTripType(text: string): 'single' | 'round' {
  const t = text.toLowerCase();
  if (t.includes('one') || t.includes('single') || t.includes('way')) return 'single';
  if (t.includes('round') || t.includes('both') || t.includes('return')) return 'round';
  return 'round';
}

/** Parse language from common names: "Hindi" -> "hi", "English" -> "en" */
export function parseLanguage(text: string): 'en' | 'hi' | 'ta' | 'mr' | 'kn' | 'bn' {
  const t = text.toLowerCase();
  if (t.includes('hindi')) return 'hi';
  if (t.includes('tamil')) return 'ta';
  if (t.includes('marathi')) return 'mr';
  if (t.includes('kannada')) return 'kn';
  if (t.includes('bengali')) return 'bn';
  return 'en';
}
