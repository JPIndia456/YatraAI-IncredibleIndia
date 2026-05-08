'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles, MapPin, Hotel, Train, Plane, Car,
  ShieldCheck, Heart, Leaf, Compass, X, Info, Check
} from 'lucide-react';
import type { PlannerInputs } from './StepInputs';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuggestionCardProps {
  s: any;
  i: number;
  inputs: PlannerInputs;
  fetchedInputs: { adults: number; kids: number } | null;
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  onConfirm: (s: any, dest: string) => void;
  onAskAI: (dest: string) => void;
}

interface StepSuggestionsProps {
  suggestions: any[];
  inputs: PlannerInputs;
  fetchedInputs: { adults: number; kids: number } | null;
  selectedIdx: number | null;
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  onConfirm: (s: any, dest: string) => void;
  onAskAI: (dest: string) => void;
  onBack: () => void;
  onReset: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
const calculateRooms = (a: number, k: number) => {
  const ai = Math.max(0, Math.floor(Number(a)) || 0);
  const ki = Math.max(0, Math.floor(Number(k)) || 0);
  if (ai <= 2 && ki <= 2) return 1;
  if (ki === 0) return Math.max(1, Math.ceil(ai / 3));
  let rooms = Math.max(1, Math.ceil(ai / 2));
  if (ki > rooms * 2) rooms += Math.ceil((ki - rooms * 2) / 2);
  return Math.max(1, rooms);
};

const getNum = (str?: string | number | null) => {
  if (str == null || str === 'N/A') return 0;
  if (typeof str === 'number') return Number.isFinite(str) ? Math.round(str) : 0;
  let num = 0;
  String(str).replace(/₹?\s?([0-9,]+)/, (_m, p1) => {
    num = parseInt(p1.replace(/,/g, ''), 10);
    return _m;
  });
  return Number.isFinite(num) ? num : 0;
};

/* ── Estimate Tabs ─────────────────────────────────────────────────────── */
function EstimateTabs({
  fNum, tNum, hNum, taxiNum, isTaxiGrey, currentPax, nights, currentRooms, fetchedRooms, active, setActive, tripType
}: any) {
  const isRound = tripType === 'round';
  const fTotal = fNum * currentPax * (isRound ? 2 : 1);
  const tTotal = tNum * currentPax * (isRound ? 2 : 1);
  const hTotal = Math.round(hNum / (fetchedRooms || 1)) * currentRooms * nights;
  const eTaxi = isTaxiGrey ? 0 : taxiNum;
  const gFlight = fTotal + hTotal + eTaxi;
  const gTrain = tTotal + hTotal + eTaxi;
  const gMix = (fTotal / 2) + (tTotal / 2) + hTotal + eTaxi;

  const inr = (n: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;

  const tabs = [];
  if (fNum > 0) tabs.push({ id: 'air', label: 'Air', total: gFlight, icon: Plane, color: 'text-saffron', bg: 'bg-saffron/10' });
  if (tNum > 0) tabs.push({ id: 'rail', label: 'Rail', total: gTrain, icon: Train, color: 'text-amber-800', bg: 'bg-amber-800/10' });
  if (fNum > 0 && tNum > 0) tabs.push({ id: 'mix', label: 'Mix', total: gMix, icon: Sparkles, color: 'text-saffron', bg: 'bg-saffron/10' });

  const cur = tabs.find(foundTab => foundTab.id === active) || tabs[0];
  if (!cur) return null;

  const lineItems = active === 'mix'
    ? [
      { icon: Plane, label: `Flight ${isRound ? '(Return)' : '(1-way)'}`, val: Math.round(fTotal / (isRound ? 2 : 1)), color: 'text-saffron' },
      { icon: Train, label: `Train ${isRound ? '(Return)' : '(1-way)'}`, val: Math.round(tTotal / (isRound ? 2 : 1)), color: 'text-amber-800' },
      { icon: Hotel, label: `Stay (${nights}N)`, val: hTotal, color: 'text-green' },
      { icon: Car, label: 'Taxi', val: taxiNum, color: 'text-saffron', grey: isTaxiGrey },
    ]
    : [
      { 
        icon: active === 'air' ? Plane : Train, 
        label: active === 'air' 
          ? `Flight (${currentPax} pax${isRound ? ', Return' : ''})` 
          : `Train (${currentPax} pax${isRound ? ', Return' : ''})`, 
        val: active === 'air' ? fTotal : tTotal, 
        color: active === 'air' ? 'text-saffron' : 'text-amber-800' 
      },
      { icon: Hotel, label: `Stay (${nights}N)`, val: hTotal, color: 'text-green' },
      { icon: Car, label: 'Taxi', val: taxiNum, color: 'text-saffron', grey: isTaxiGrey },
    ];

  return (
    <div className="bg-saffron/5 border border-saffron/15 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-saffron uppercase tracking-widest">Grand Total Estimate</p>
        <div className="flex bg-white/40 backdrop-blur-sm border border-slate-200/60 rounded-xl p-1 gap-1 shadow-sm">
          {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={e => { e.stopPropagation(); setActive(tab.id); }}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all flex items-center gap-1.5 ${active === tab.id ? `${tab.bg} ${tab.color}` : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
          ))}
        </div>
      </div>
      <p className="text-2xl font-black text-saffron leading-none tracking-tighter italic">{inr(cur.total)}</p>
      <div className="space-y-1 pt-1 border-t border-slate-200/50">
        {lineItems.map((item, idx) => (
          <div key={idx} className={`flex items-center justify-between text-xs ${item.grey ? 'opacity-30 line-through' : ''}`}>
            <span className={`flex items-center gap-1.5 font-medium ${item.grey ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
              <item.icon className={`w-3 h-3 ${item.color}`} />
              {item.label}
            </span>
            <span className="font-semibold text-saffron">{inr(item.val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Single Suggestion Card ─────────────────────────────────────────────── */
function SuggestionCard({ s, i, inputs, fetchedInputs, setInputs, onConfirm, onAskAI }: SuggestionCardProps) {
  const [pending, setPending] = useState(false);
  const [locationCheckAnswer, setLocationCheckAnswer] = useState<'yes' | 'no' | null>(null);
  const [activeTab, setActiveTab] = useState<'air' | 'rail'>('air');
  const { t } = useLanguage();

  const locationCheckText = typeof s.location_check === 'string' ? s.location_check.trim() : '';
  useEffect(() => {
    setLocationCheckAnswer(null);
  }, [locationCheckText]);

  const startMs = new Date(inputs.startDate).getTime();
  const endMs = new Date(inputs.endDate).getTime();
  const daySpan = (endMs - startMs) / (1000 * 60 * 60 * 24);
  const nights =
    Number.isFinite(daySpan) && daySpan > 0 ? Math.max(1, Math.ceil(daySpan)) : 1;
  const currentPax =
    Math.max(1, Math.floor(Number(inputs.adults)) || 1) + Math.max(0, Math.floor(Number(inputs.kids)) || 0);
  const currentRooms = calculateRooms(inputs.adults, inputs.kids);
  const fetchedRooms = calculateRooms(fetchedInputs?.adults || 2, fetchedInputs?.kids || 0);

  const fNum = getNum(s.flight_cost);
  const tNum = getNum(s.train_cost);
  const hNum = getNum(s.hotel_per_night);
  const taxiNum = getNum(s.taxi_cost);
  const isTaxiGrey = fNum > 0 && tNum > 0;

  const isRound = inputs.tripType === 'round';

  const formatPrice = (str?: string | number | null, pax = 1, isTransit = false) => {
    const n = getNum(str);
    if (!n || str === 'N/A') return '—';
    const line = n * pax * (isTransit && isRound ? 2 : 1);
    if (!Number.isFinite(line)) return '—';
    return `₹${line.toLocaleString('en-IN')}`;
  };

  const transportItems = [
    { id: 'air', icon: Plane, label: `Flight${isRound ? ' (Return)' : ''}`, val: s.flight_cost, pax: currentPax, color: 'saffron', detail: s.flight_name || s.nearest_airport, isTransit: true },
    { id: 'rail', icon: Train, label: `Train${isRound ? ' (Return)' : ''}`, val: s.train_cost, pax: currentPax, color: 'saffron', detail: s.train_name || s.nearest_railway, isTransit: true },
    { id: 'taxi', icon: Car, label: 'Taxi', val: s.taxi_cost, pax: 1, color: 'green', detail: 'Round-trip est.', isTransit: false },
    { id: 'hotel', icon: Hotel, label: 'Hotel/night', val: s.hotel_per_night, pax: 1, color: 'saffron', detail: s.hotel_name || 'Per night est.', isTransit: false },
  ].filter(item => {
    if (item.label.includes('Flight') && (!s.flight_cost || s.flight_cost === 'N/A') && (!s.train_cost || s.train_cost === 'N/A')) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08, type: 'spring', damping: 22 }}
      className="group relative"
    >
      {/* Hover glow */}
      <div className="absolute -inset-px bg-gradient-to-r from-saffron/15 to-saffron/15 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

      <div className="relative glass-panel p-4 md:p-5 space-y-3 rounded-xl">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {s.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {s.tags.map((tag: string) => (
                  <span key={tag} className="text-11 font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[var(--text-muted)] border border-slate-200">{tag}</span>
                ))}
              </div>
            )}
            <h3 className="text-lg font-black text-saffron group-hover:text-orange-600 transition-colors leading-tight uppercase italic tracking-tight">{s.title}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-saffron shrink-0" />
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-widest">{s.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-11 font-semibold px-2.5 py-1 rounded-full bg-green/10 border border-green/20 text-green">Verified</span>
          </div>
        </div>

        {/* Quote */}
        {s.why && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-saffron/30 pl-3">
            "{s.why}"
          </p>
        )}

        {locationCheckText.length > 0 && (
          <div
            className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 space-y-2.5"
            role="region"
            aria-label="Location clarification"
          >
            <div className="flex gap-2.5">
              <Info className="w-4 h-4 text-[#FF671F] shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 space-y-1 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF671F]">Quick check</p>
                <p className="text-sm text-zinc-700 font-medium leading-snug">{locationCheckText}</p>
              </div>
            </div>
            {locationCheckAnswer === null ? (
              <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0 sm:justify-end">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide w-full sm:w-auto sm:mr-auto">
                  Does this match what you want?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const canonical = String(s.destination || '').trim();
                    if (canonical) {
                      setInputs((p) => ({ ...p, specificDest: canonical }));
                    }
                    setLocationCheckAnswer('yes');
                    toast.success('Destination confirmed', {
                      description: canonical
                        ? `We’ll use “${canonical}” for hotels, trains and ferries.`
                        : 'Thanks — your picks will align with this card.',
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#FF671F] hover:bg-orange-600 text-white text-xs font-black transition-all shadow-md shadow-saffron/20 active:scale-95"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocationCheckAnswer('no');
                    toast.message('Update your destination', {
                      description:
                        'Edit the destination field above, then run Discover again so pricing and routes match the right place.',
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-95 shadow-sm"
                >
                  No
                </button>
              </div>
            ) : locationCheckAnswer === 'yes' ? (
              <p className="text-[11px] text-emerald-300/95 font-semibold pl-7 sm:pl-0 border-t border-slate-200 pt-2">
                Thanks — destination saved for matching live hotels and transport.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400 font-medium pl-7 sm:pl-0 border-t border-slate-200 pt-2">
                Understood — adjust your destination above and discover again when you’re ready.
              </p>
            )}
          </div>
        )}

        {/* Grand Total Tabs */}
        <EstimateTabs
          fNum={fNum} tNum={tNum} hNum={hNum} taxiNum={taxiNum}
          isTaxiGrey={isTaxiGrey} currentPax={currentPax}
          nights={nights} currentRooms={currentRooms} fetchedRooms={fetchedRooms}
          active={activeTab} setActive={setActiveTab}
          tripType={inputs.tripType}
        />

        {/* Transport breakdown table */}
        <div className="bg-white/40 rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white/5">
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Component</th>
                <th className="py-2 px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Investment</th>
              </tr>
            </thead>
            <tbody>
              {transportItems.map((item, idx) => {
                const isNoData = !getNum(item.val) || item.val === 'N/A';
                const isExcluded = (activeTab === 'air' && item.id === 'rail') || (activeTab === 'rail' && item.id === 'air');
                const isGrey = isNoData || isExcluded;

                return (
                  <tr key={idx} className={`border-b last:border-0 border-slate-200 transition-all duration-300 ${isGrey ? 'opacity-25 grayscale' : ''}`}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-3.5 h-3.5 ${isGrey ? 'text-slate-400' : (item.color === 'green' ? 'text-green' : 'text-saffron')}`} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-saffron uppercase tracking-tight leading-none">{item.label}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase truncate mt-0.5">
                            {isNoData ? 'N/A' : (isExcluded ? 'NOT SELECTED' : item.detail)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[11px] font-black italic tracking-tighter ${isGrey ? 'text-zinc-600' : 'text-saffron'}`}>
                        {isNoData ? '—' : formatPrice(item.val, item.pax, (item as any).isTransit)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-orange-400 font-black uppercase">Safety</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.safety_score || '9.5/10'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <Heart className="w-3.5 h-3.5 text-saffron shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-saffron font-black uppercase">Tip</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.caring_tip || 'Carry light layers'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <Leaf className="w-3.5 h-3.5 text-green shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-green font-black uppercase">Eco</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.sustainability_hint || 'Train available'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onAskAI(s.destination)}
            className="btn-ghost p-2.5"
            title="Ask AI about this destination"
          >
            <Info className="w-4 h-4" />
          </button>

           {pending ? (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-black text-saffron uppercase hidden sm:block italic">Build trip?</span>
              <button
                onClick={() => { setPending(false); onConfirm(s, s.destination); }}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green text-white text-[10px] font-black uppercase transition-all shadow-lg shadow-green/20 active:scale-95 italic"
              >
                <Check className="w-3 h-3" /> Yes
              </button>
              <button
                onClick={() => setPending(false)}
                className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase transition-all active:scale-95 italic"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPending(true)}
              className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-zinc-950 text-white text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg active:scale-95 italic"
            >
              {t('confirm_and_plan')} →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── StepSuggestions ────────────────────────────────────────────────────── */
export default function StepSuggestions({
  suggestions, inputs, fetchedInputs, selectedIdx, setInputs,
  onConfirm, onAskAI, onBack, onReset,
}: StepSuggestionsProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      key="step-suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 md:landscape:space-y-4"
    >
      {/* Header */}
      <div className="text-center space-y-2 pt-2 md:landscape:space-y-1 md:landscape:pt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-saffron" />
          <span className="text-xs font-semibold text-saffron">AI Discovery</span>
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">
          <span className="text-saffron">YOUR</span> <span className="text-slate-400">DISCOVERY</span> <span className="text-green">OPTIONS</span>
        </h2>
        <p className="text-caption">From {inputs.origin}</p>
      </div>

      {/* Live pax adjuster */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-3 md:landscape:py-2 border-y border-slate-200">
        <span className="text-caption">Adjust travelers:</span>
        {(['adults', 'kids'] as const).map(type => (
          <div key={type} className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-xl px-4 py-2 border border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)] capitalize">{type}</span>
            <button onClick={() => setInputs(p => ({ ...p, [type]: Math.max(type === 'adults' ? 1 : 0, (p as any)[type] - 1) }))} className="text-[var(--text-secondary)] hover:text-saffron">−</button>
            <span className="text-sm font-semibold text-saffron w-4 text-center">{(inputs as any)[type]}</span>
            <button onClick={() => setInputs(p => ({ ...p, [type]: (p as any)[type] + 1 }))} className="text-[var(--text-secondary)] hover:text-saffron">+</button>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-5">
        {suggestions.map((s, i) => (
          <div key={i} className={`relative rounded-2xl transition-all ${selectedIdx === i ? 'ring-2 ring-saffron ring-offset-4 ring-offset-white' : ''}`}>
            {selectedIdx === i && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saffron text-white text-[10px] font-black uppercase px-3 py-1 rounded-full z-10 shadow-lg italic">
                Current Selection
              </div>
            )}
            <SuggestionCard
              s={s} i={i}
              inputs={inputs}
              fetchedInputs={fetchedInputs}
              setInputs={setInputs}
              onConfirm={onConfirm}
              onAskAI={onAskAI}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest bg-[#046A38] border border-green-600 px-8 py-4 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-green-800"
        >
          ← {t('adjust_details')}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-[10px] font-medium text-zinc-600 hover:text-saffron transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('reset_everything')}
        </button>
      </div>
    </motion.div>
  );
}
