'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Users, Wallet, Sparkles,
  Sun, ShieldCheck, Check, ArrowUpDown, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import LocationSearch from '@/components/search/LocationSearch';
import { ddMmYyyyToIso, isoDateToDdMmYyyy } from '@/lib/dateFormat';
import type { LocationIntelPayload } from '@/lib/locationIntelligence';

// ── Types (re-exported from parent) ────────────────────────────────────────
export type BudgetTier = 'economy' | 'moderate' | 'luxury' | 'mix';
export type DestType = 'mountains' | 'beaches' | 'pilgrimage' | 'jungle' | 'monuments' | 'riverside';
export type DietType = 'veg' | 'jain' | 'halal' | 'non-veg' | 'vegan';
export type Language = 'en' | 'hi' | 'ta' | 'mr' | 'kn' | 'bn';
export type TripType = 'single' | 'round';

export interface PlannerInputs {
  startDate: string;
  endDate: string;
  dietary: DietType[];
  adults: number;
  kids: number;
  kidAges: string;
  budget: BudgetTier;
  destTypes: DestType[];
  language: Language;
  specificDest: string;
  origin: string;
  tripType: TripType;
  targetBudget: number;
  ecoFriendly: boolean;
  wheelchair: boolean;
  telegramId: string;
}

interface StepInputsProps {
  inputs: PlannerInputs;
  activeLang: Language;
  setActiveLang: (l: Language) => void;
  setInputs: React.Dispatch<React.SetStateAction<PlannerInputs>>;
  patchTourGuide: (patch: any) => void;
  onDiscover: () => void;
}

const LANG_OPTIONS: Array<{ code: Language; name: string; native: string }> = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

const DEST_CONFIGS: Record<DestType, { label: string; emoji: string }> = {
  mountains:  { label: 'Mountains',  emoji: '🏔️' },
  beaches:    { label: 'Beaches',    emoji: '🏖️' },
  pilgrimage: { label: 'Pilgrimage', emoji: '🙏' },
  jungle:     { label: 'Wildlife',   emoji: '🌿' },
  monuments:  { label: 'Heritage',   emoji: '🏛️' },
  riverside:  { label: 'Riverside',  emoji: '🌊' },
};

const BUDGET_PRESETS = [
  { value: 15000,  label: '₹15k' },
  { value: 30000,  label: '₹30k' },
  { value: 50000,  label: '₹50k' },
  { value: 100000, label: '₹1L' },
  { value: 200000, label: '₹2L' },
  { value: 300000, label: '₹3L' },
];

const toggleArr = <T,>(arr: T[], val: T): T[] =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

export default function StepInputs({
  inputs,
  activeLang,
  setActiveLang,
  setInputs,
  patchTourGuide,
  onDiscover,
}: StepInputsProps) {
  const { t } = useLanguage();
  const [showIntelDetail, setShowIntelDetail] = useState(false);
  const [locationIntel, setLocationIntel] = useState<LocationIntelPayload | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);
  const todayIso = new Date().toISOString().split('T')[0];
  const [startDisplay, setStartDisplay] = useState(() =>
    inputs.startDate ? isoDateToDdMmYyyy(inputs.startDate) : '',
  );
  const [endDisplay, setEndDisplay] = useState(() =>
    inputs.tripType === 'single' ? '' : inputs.endDate ? isoDateToDdMmYyyy(inputs.endDate) : '',
  );

  useEffect(() => {
    setStartDisplay(inputs.startDate ? isoDateToDdMmYyyy(inputs.startDate) : '');
  }, [inputs.startDate]);

  useEffect(() => {
    setEndDisplay(
      inputs.tripType === 'single' ? '' : inputs.endDate ? isoDateToDdMmYyyy(inputs.endDate) : '',
    );
  }, [inputs.endDate, inputs.tripType]);

  useEffect(() => {
    const o = inputs.origin.trim();
    const d = inputs.specificDest.trim();
    if (!o && !d) {
      setLocationIntel(null);
      return;
    }
    const ac = new AbortController();
    const tid = setTimeout(async () => {
      setIntelLoading(true);
      try {
        const res = await fetch('/api/planner/location-intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: inputs.origin,
            destination: inputs.specificDest,
            language: inputs.language,
          }),
          signal: ac.signal,
        });
        const data = await res.json();
        if (data.success) setLocationIntel(data as LocationIntelPayload);
        else setLocationIntel(null);
      } catch (e: unknown) {
        if ((e as Error)?.name !== 'AbortError') setLocationIntel(null);
      } finally {
        setIntelLoading(false);
      }
    }, 680);
    return () => {
      clearTimeout(tid);
      ac.abort();
    };
  }, [inputs.origin, inputs.specificDest, inputs.language]);

  const openPicker = (ref: { current: HTMLInputElement | null }) => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* fall through */
      }
    }
    el.click();
  };

  return (
    <motion.div
      key="step-inputs"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-5"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#003366]">{t('plan_journey')}</h2>
          <p className="text-caption mt-0.5">{t('fill_details')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeLang}
            onChange={(e) => {
              const next = e.target.value as Language;
              setActiveLang(next);
              setInputs((p) => ({ ...p, language: next }));
              patchTourGuide({ language: next });
            }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[10px] text-[#003366] font-semibold outline-none cursor-pointer"
            style={{ colorScheme: 'dark' }}
            aria-label="Planner language"
          >
            {LANG_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-zinc-900 text-[#003366]">
                {lang.native} - {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Unified Search Capsule: Dates + Route ──────────────────────── */}
      <div className="glass-panel relative z-30 overflow-visible p-4 space-y-4 border border-blue-600/15">
        <div className="space-y-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('travel_dates')}</span>
        </div>
        <div className="space-y-1.5">
          <label className="text-caption">Trip Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'single' as const, label: 'Single Trip' },
              { id: 'round' as const, label: 'Round Trip' },
            ].map((opt) => {
              const selected = inputs.tripType === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    selected
                      ? 'bg-blue-600/10 border-blue-600/35 text-blue-600'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[#003366]'
                  }`}
                >
                  <input
                    type="radio"
                    name="trip-type"
                    value={opt.id}
                    checked={selected}
                    onChange={() =>
                      setInputs((p) => ({
                        ...p,
                        tripType: opt.id,
                        endDate: opt.id === 'single' ? '' : p.endDate,
                      }))
                    }
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{t('departure')}</label>
            <div className="relative flex gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                autoFocus
                value={startDisplay}
                onChange={(e) => setStartDisplay(e.target.value)}
                onBlur={() => {
                  const iso = ddMmYyyyToIso(startDisplay);
                  if (iso) {
                    setInputs((p) => ({ ...p, startDate: iso }));
                    setStartDisplay(isoDateToDdMmYyyy(iso));
                  } else if (!startDisplay.trim()) {
                    setInputs((p) => ({ ...p, startDate: '' }));
                  } else {
                    setStartDisplay(inputs.startDate ? isoDateToDdMmYyyy(inputs.startDate) : '');
                  }
                }}
                className="min-w-0 flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[#003366] outline-none focus:border-blue-600/50 transition-all placeholder:text-zinc-600"
              />
              <button
                type="button"
                aria-label="Pick departure date"
                onClick={() => openPicker(startPickerRef)}
                className="shrink-0 flex items-center justify-center w-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-blue-600/40 transition-all"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
              </button>
              <input
                ref={startPickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                value={inputs.startDate}
                min={todayIso}
                onChange={(e) => {
                  const v = e.target.value;
                  setInputs((p) => ({ ...p, startDate: v }));
                  setStartDisplay(v ? isoDateToDdMmYyyy(v) : '');
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
              {t('return')}
              {inputs.tripType === 'single' && (
                <span className="ml-1.5 font-normal normal-case text-slate-500">(round trip only)</span>
              )}
            </label>
            <div className="relative flex gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={endDisplay}
                disabled={inputs.tripType === 'single'}
                onChange={(e) => setEndDisplay(e.target.value)}
                onBlur={() => {
                  if (inputs.tripType === 'single') return;
                  const iso = ddMmYyyyToIso(endDisplay);
                  if (iso) {
                    setInputs((p) => ({ ...p, endDate: iso }));
                    setEndDisplay(isoDateToDdMmYyyy(iso));
                  } else if (!endDisplay.trim()) {
                    setInputs((p) => ({ ...p, endDate: '' }));
                  } else {
                    setEndDisplay(inputs.endDate ? isoDateToDdMmYyyy(inputs.endDate) : '');
                  }
                }}
                className="min-w-0 flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[#003366] outline-none focus:border-blue-600/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-zinc-600"
              />
              <button
                type="button"
                aria-label="Pick return date"
                disabled={inputs.tripType === 'single'}
                onClick={() => openPicker(endPickerRef)}
                className="shrink-0 flex items-center justify-center w-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-blue-600/40 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
              </button>
              <input
                ref={endPickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                className="sr-only"
                value={inputs.tripType === 'single' ? '' : inputs.endDate}
                min={inputs.startDate || todayIso}
                disabled={inputs.tripType === 'single'}
                onChange={(e) => {
                  const v = e.target.value;
                  setInputs((p) => ({ ...p, endDate: v }));
                  setEndDisplay(v ? isoDateToDdMmYyyy(v) : '');
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          {inputs.tripType === 'single'
            ? 'Single trip selected: we auto-calculate a 1-night checkout for stays.'
            : 'Round trip selected: add both departure and return dates.'}
        </p>
        </div>

        <div className="h-px bg-zinc-800/80" />

        <div className="space-y-3">
        <div className="flex items-center gap-2 mb-0.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('route')}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>Set route in one tap with swap.</span>
          <button
            onClick={() =>
              setInputs((p) => ({
                ...p,
                origin: p.specificDest,
                specificDest: p.origin,
              }))
            }
            disabled={!inputs.origin && !inputs.specificDest}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:border-white/15 text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Swap origin and destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Swap
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('from_city')}</label>
            <LocationSearch
              placeholder={t('from_placeholder')}
              value={inputs.origin}
              onChange={val => {
                setInputs(p => ({ ...p, origin: val }));
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('destination')}</label>
            <LocationSearch
              placeholder={t('dest_placeholder')}
              value={inputs.specificDest}
              onEnter={onDiscover}
              onChange={val => {
                setInputs(p => ({ ...p, specificDest: val }));
              }}
            />
          </div>
        </div>

        {(inputs.origin.trim() || inputs.specificDest.trim()) && (
          <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400/90 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-green-900">
                    Route clarity
                  </span>
                  {locationIntel && (
                    <span
                      title={`Mapping confidence: ${locationIntel.confidence}`}
                      aria-label={`Route mapping confidence ${locationIntel.confidence}`}
                      className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border leading-none whitespace-nowrap ${
                        locationIntel.confidence === 'high'
                          ? 'border-blue-600/35 text-blue-600 bg-blue-600/10'
                          : locationIntel.confidence === 'medium'
                            ? 'border-amber-500/35 text-amber-300 bg-black/20'
                            : 'border-rose-500/35 text-rose-300 bg-rose-500/10'
                      }`}
                    >
                      {locationIntel.confidence}
                    </span>
                  )}
                </div>
                {intelLoading ? (
                  <p className="text-[11px] text-zinc-400 leading-snug">Checking how booking engines read your cities…</p>
                ) : locationIntel ? (
                  <>
                    <p className="text-[11px] sm:text-xs text-green-800 leading-snug font-medium">{locationIntel.friendly_summary}</p>
                    {locationIntel.clarification_needed && (
                      <p className="text-[10px] text-amber-200/95 font-medium leading-snug">
                        Confirm anything unclear below for better trains, stays, and ferry matches.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Enter your route details above to see personalized travel tips and checks.
                  </p>
                )}
              </div>
            </div>

            {locationIntel && locationIntel.experience_tips.length > 0 && (
              <details className="group rounded-md bg-black/20 border border-white/[0.06] open:border-slate-200">
                <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-700 flex items-center justify-between gap-2">
                  <span>Search tips ({locationIntel.experience_tips.length})</span>
                  <ChevronDown className="w-3 h-3 shrink-0 text-blue-500 group-open:rotate-180 transition-transform" aria-hidden />
                </summary>
                <ul className="list-disc list-outside pl-5 pr-2.5 pb-2 space-y-0.5 text-[10px] text-blue-600/90 leading-snug">
                  {locationIntel.experience_tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </details>
            )}

            {locationIntel &&
              (locationIntel.suggested_origin || locationIntel.suggested_destination) && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {locationIntel.suggested_origin &&
                    locationIntel.suggested_origin.trim().toLowerCase() !==
                      inputs.origin.trim().toLowerCase() && (
                      <button
                        type="button"
                        onClick={() =>
                          setInputs((p) => ({ ...p, origin: locationIntel.suggested_origin!.trim() }))
                        }
                        className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/10 border border-slate-200 hover:border-green-600/50 text-green-800 transition-colors"
                      >
                        Use departure: {locationIntel.suggested_origin}
                      </button>
                    )}
                  {locationIntel.suggested_destination &&
                    locationIntel.suggested_destination.trim().toLowerCase() !==
                      inputs.specificDest.trim().toLowerCase() && (
                      <button
                        type="button"
                        onClick={() =>
                          setInputs((p) => ({
                            ...p,
                            specificDest: locationIntel.suggested_destination!.trim(),
                          }))
                        }
                        className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/10 border border-slate-200 hover:border-green-600/50 text-green-800 transition-colors"
                      >
                        Use destination: {locationIntel.suggested_destination}
                      </button>
                    )}
                </div>
              )}

            {locationIntel && locationIntel.clarifying_questions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowIntelDetail((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-600 transition-colors pt-0.5"
              >
                {showIntelDetail ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {showIntelDetail ? 'Hide' : 'Show'} suggested checks ({locationIntel.clarifying_questions.length})
              </button>
            )}
            {locationIntel && showIntelDetail && locationIntel.clarifying_questions.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-200">
                {locationIntel.clarifying_questions.map((cq, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-[#003366] leading-snug">{cq.question}</p>
                    <p className="text-[10px] text-slate-500 leading-snug">{cq.why_it_matters}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ── Section 3: Budget & Party ──────────────────────────────────── */}
      <div className="glass-panel relative z-10 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Budget */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('total_budget')}</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setInputs(p => ({ ...p, targetBudget: Math.max(10000, p.targetBudget - 5000) }))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-slate-200 text-zinc-400 hover:text-[#003366] hover:bg-zinc-800 transition-all text-sm font-bold"
              >
                −
              </motion.button>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-semibold text-xs">₹</span>
                <input
                  type="number"
                  min="10000"
                  max="500000"
                  step="5000"
                  value={inputs.targetBudget}
                  onChange={e => {
                    setInputs(p => ({ ...p, targetBudget: Number(e.target.value) }));
                  }}
                  className="w-full bg-transparent border-none pl-7 pr-4 py-1.5 text-sm font-black text-[#003366] outline-none text-center italic"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setInputs(p => ({ ...p, targetBudget: Math.min(500000, p.targetBudget + 5000) }))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-600 hover:bg-blue-600/20 transition-all text-sm font-bold"
              >
                +
              </motion.button>
            </div>
          </div>

          {/* Party size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('party_size')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['adults', 'kids'] as const).map(type => (
                <div key={type} className="flex bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-2 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs">
                      {type === 'adults' ? '👤' : '👶'}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-tight text-[#003366]">{type === 'adults' ? t('adults') : t('kids')}</p>
                      <p className="text-[7px] text-[var(--text-muted)] font-bold uppercase">{type === 'adults' ? '12+Y' : '0-12Y'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-black/20 rounded-full px-1.5 py-0.5 border border-slate-200">
                    <button
                      onClick={() => setInputs(p => {
                        const v = Math.max(type === 'adults' ? 1 : 0, (p as any)[type] - 1);
                        return { ...p, [type]: v };
                      })}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#003366] transition-all text-base"
                    >
                      −
                    </button>
                    <span className="text-[13px] font-black text-[#003366] w-3 text-center italic">{(inputs as any)[type]}</span>
                    <button
                      onClick={() => setInputs(p => {
                        const v = (p as any)[type] + 1;
                        return { ...p, [type]: v };
                      })}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 hover:text-blue-600 transition-all text-base"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Preferences (progressive disclosure) ───────────── */}
      <div className="glass-panel p-4 space-y-4">
        <div className="px-3 py-1 border-b border-slate-200 mb-2">
          <span className="text-label">
            {t('preferences')}
            <span className="text-slate-500 font-normal normal-case text-xs ml-1">(optional)</span>
          </span>
        </div>




        {/* Destination type chips */}
        <div className="space-y-1.5">
          <label className="text-caption">Destination Type</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEST_CONFIGS) as DestType[]).map(type => {
              const sel = inputs.destTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => setInputs(p => {
                    const next = toggleArr(p.destTypes, type);
                    return { ...p, destTypes: next };
                  })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    sel
                      ? 'bg-blue-600/12 border-blue-600/35 text-blue-600'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[#003366] hover:border-white/15'
                  }`}
                >
                  <span>{DEST_CONFIGS[type].emoji}</span>
                  {DEST_CONFIGS[type].label}
                  {sel && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary */}
        <div className="space-y-1.5">
          <label className="text-caption">Dietary</label>
          <div className="flex flex-wrap gap-2">
            {(['veg', 'jain', 'non-veg'] as DietType[]).map(d => (
              <button
                key={d}
                onClick={() => setInputs(p => {
                  const next = toggleArr(p.dietary, d);
                  return { ...p, dietary: next };
                })}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all ${
                  inputs.dietary.includes(d)
                    ? 'bg-blue-600/12 border-blue-600/35 text-blue-600'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[#003366]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
          <button
            onClick={() => setInputs(p => {
              const next = !p.ecoFriendly;
              return { ...p, ecoFriendly: next };
            })}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
              inputs.ecoFriendly
                ? 'bg-blue-600/10 border-blue-600/30 text-emerald-300'
                : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <Sun className={`w-4 h-4 mt-0.5 ${inputs.ecoFriendly ? 'text-blue-600' : 'text-[var(--text-muted)]'}`} />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">{t('sustainable_journey')}</p>
              <p className="text-[10px] opacity-70 mt-0.5 leading-tight">Green hotels & eco-routes</p>
            </div>
          </button>
          <button
            onClick={() => setInputs(p => {
              const next = !p.wheelchair;
              return { ...p, wheelchair: next };
            })}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
              inputs.wheelchair
                ? 'bg-blue-600/10 border-blue-600/30 text-cyan-300'
                : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 mt-0.5 ${inputs.wheelchair ? 'text-blue-600' : 'text-[var(--text-muted)]'}`} />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">{t('accessible_safe')}</p>
              <p className="text-[10px] opacity-70 mt-0.5 leading-tight">Solo-safe & senior-ready</p>
            </div>
          </button>
        </div>

      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <button
        onClick={onDiscover}
        className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-orange-700 text-[#003366] font-semibold py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:scale-[1.01] transition-all active:scale-[0.98] text-sm"
      >
        <Sparkles className="w-4 h-4" />
        {t('discover_options')}
      </button>
    </motion.div>
  );
}
