'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Heart, 
  Leaf, 
  X, 
  Sparkles, 
  ChevronRight, 
  MessageSquare, 
  CloudSun, 
  Zap, 
  Hotel, 
  Train, 
  Plane, 
  Car, 
  Info, 
  Ship,
  Check,
  Bus
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
  fNum, tNum, bNum, ferryNum, hNum, taxiNum, otherNum, isTaxiGrey, currentPax, nights, currentRooms, fetchedRooms, active, setActive, tripType
}: any) {
  const isRound = tripType === 'round';
  const fTotal = fNum * currentPax;
  const tTotal = tNum * currentPax;
  const bTotal = bNum * currentPax;
  const ferryTotal = ferryNum * currentPax;
  const hTotal = Math.round(hNum / (fetchedRooms || 1)) * currentRooms * nights;
  
  const gFlight = fTotal + hTotal;
  const gTrain = tTotal + hTotal;
  const gBus = bTotal + hTotal;
  const gFerry = ferryTotal + hTotal;
  const gMix = (fTotal / 2) + (tTotal / 2) + hTotal;

  const inr = (n: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;

  const tabs = [];
  if (fNum > 0) tabs.push({ id: 'air', label: 'Air', total: gFlight, icon: Plane, color: 'text-saffron', bg: 'bg-saffron/10' });
  if (tNum > 0) tabs.push({ id: 'rail', label: 'Rail', total: gTrain, icon: Train, color: 'text-amber-800', bg: 'bg-amber-800/10' });
  if (bNum > 0) tabs.push({ id: 'bus', label: 'Bus', total: gBus, icon: Bus, color: 'text-orange-600', bg: 'bg-orange-50' });
  if (ferryNum > 0) tabs.push({ id: 'ferry', label: 'Ferry', total: gFerry, icon: Ship, color: 'text-blue-600', bg: 'bg-blue-50' });
  if (fNum > 0 && tNum > 0) tabs.push({ id: 'mix', label: 'Mix', total: gMix, icon: Sparkles, color: 'text-saffron', bg: 'bg-saffron/10' });

  const cur = tabs.find(foundTab => foundTab.id === active) || tabs[0];
  if (!cur) return null;

  let lineItems = [];
  if (active === 'mix') {
    lineItems = [
      { icon: Plane, label: `Flight ${isRound ? '(RT)' : '(1-way)'}`, val: Math.round(fTotal / (isRound ? 2 : 1)), color: 'text-saffron', pax: currentPax },
      { icon: Train, label: `Train ${isRound ? '(RT)' : '(1-way)'}`, val: Math.round(tTotal / (isRound ? 2 : 1)), color: 'text-amber-800', pax: currentPax },
      { icon: Hotel, label: `Stay (${nights}N)`, val: hTotal, color: 'text-green', pax: currentPax },
    ];
  } else {
    const activeIcon = active === 'air' ? Plane : (active === 'rail' ? Train : (active === 'ferry' ? Ship : Bus));
    const activeLabel = active === 'air' ? 'Flight' : (active === 'rail' ? 'Train' : (active === 'ferry' ? 'Ferry' : 'Bus'));
    const activeVal = active === 'air' ? fTotal : (active === 'rail' ? tTotal : (active === 'ferry' ? ferryTotal : bTotal));
    const activeColor = active === 'air' ? 'text-saffron' : (active === 'rail' ? 'text-amber-800' : (active === 'ferry' ? 'text-blue-600' : 'text-orange-600'));

    lineItems = [
      { 
        icon: activeIcon, 
        label: `${activeLabel} (${currentPax} pax, ${isRound ? 'RT' : 'OW'})`, 
        val: activeVal, 
        color: activeColor,
        pax: currentPax
      },
      { icon: Hotel, label: `Stay (${nights}N, ${currentRooms} rooms)`, val: hTotal, color: 'text-green', pax: currentPax },
    ];
  }

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
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5 font-medium">
                <item.icon className={`w-3 h-3 ${item.color}`} />
                {item.label}
              </span>
              {item.val > 0 && (
                <span className="text-[7px] opacity-60 ml-4.5 uppercase font-bold tracking-wider">
                   ₹{(item.val / (item.pax || 1)).toLocaleString()} / Pax
                </span>
              )}
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
  const otherNum = getNum(s.other_transport_cost);
  const isTaxiGrey = fNum > 0 && tNum > 0;

  const isRound = inputs.tripType === 'round';

  const formatPrice = (str?: string | number | null, pax = 1, _isTransit = false) => {
    const n = getNum(str);
    if (!n || str === 'N/A') return '—';
    const line = n * pax;
    if (!Number.isFinite(line)) return '—';
    return `₹${line.toLocaleString('en-IN')}`;
  };

  const transportItems = [
    { id: 'air', icon: Plane, label: `Flight${isRound ? ' (Return)' : ''}`, val: s.flight_cost, pax: currentPax, color: 'saffron', detail: `${s.flight_name || s.nearest_airport || 'Standard Air'} • ${s.flight_time || 'Schedule TBD'} • ${formatPrice(s.flight_cost, 1)}/Pax`, isTransit: true },
    { id: 'rail', icon: Train, label: `Train${isRound ? ' (Return)' : ''}`, val: s.train_cost, pax: currentPax, color: 'saffron', detail: `${s.train_name || s.nearest_railway || 'Express Rail'} • ${formatPrice(s.train_cost, 1)}/Pax`, isTransit: true },
    { id: 'bus', icon: Bus, label: `Bus${isRound ? ' (Return)' : ''}`, val: s.bus_cost, pax: currentPax, color: 'saffron', detail: `${s.bus_operator || 'RedBus Express'} • ${formatPrice(s.bus_cost, 1)}/Pax`, isTransit: true },
    { id: 'ferry', icon: Ship, label: 'Ferry Crossing', val: s.ferry_cost, pax: currentPax, color: 'saffron', detail: `${s.ferry_note || 'Coastal Ferry'} • ${formatPrice(s.ferry_cost, 1)}/Pax`, isTransit: true },
    { id: 'hotel', icon: Hotel, label: 'Hotel/night', val: s.hotel_per_night, pax: 1, color: 'saffron', detail: `${s.hotel_name || 'Premium Stay'} • ${s.hotel_location || s.destination || 'Prime Area'}`, isTransit: false },
  ].filter(item => {
    if (item.id === 'air' && (!s.flight_cost || s.flight_cost === 'N/A')) return false;
    if (item.id === 'rail' && (!s.train_cost || s.train_cost === 'N/A')) return false;
    if (item.id === 'bus' && (!s.bus_cost || s.bus_cost === 'N/A')) return false;
    if (item.id === 'ferry' && (!s.ferry_cost || s.ferry_cost === 'N/A')) return false;
    return true;
  });

  const currentTotal = activeTab === 'air' 
    ? (fNum * currentPax + hNum * currentRooms * nights) 
    : (tNum * currentPax + hNum * currentRooms * nights);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08, type: 'spring', damping: 22 }}
      className="group relative"
    >
      {/* Hover glow */}
      <div className="absolute -inset-px bg-gradient-to-r from-saffron/15 to-saffron/15 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />

      <div 
        onClick={() => onConfirm(s, s.destination)}
        className="relative glass-panel overflow-hidden group/card shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] cursor-pointer active:scale-[0.98]"
      >

        <div className="p-3 md:p-4 space-y-3 relative z-10 bg-white">
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
            <h3 className="text-xl md:text-2xl font-black text-[#000080] group-hover:text-[#FF9933] transition-colors leading-none uppercase tracking-tighter">{s.title}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FF9933] shrink-0" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.destination}</p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50/50 px-2 py-0.5 rounded-full border border-blue-100/50">
                <CloudSun className="w-3 h-3 text-blue-400 shrink-0" />
                <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider italic">{s.weather_summary || 'Syncing...'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-[#138808]/10 border border-[#138808]/20 text-[#138808] uppercase tracking-widest">Verified</span>
          </div>
        </div>

        {/* Quote */}
        {s.why && (
          <p className="text-lg text-slate-600 font-bold leading-relaxed italic border-l-4 border-[#FF9933]/30 pl-6 py-1">
            "{s.why}"
          </p>
        )}

        {/* Premium Highlights Bar */}
        <div className="flex flex-wrap items-center gap-6 py-4 border-y border-slate-100">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FF9933]/5 flex items-center justify-center border border-[#FF9933]/10">
                <Calendar className="w-7 h-7 text-[#FF9933]" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Duration</p>
                <p className="text-2xl font-black text-[#000080] uppercase tracking-tighter leading-none">{s.nights || nights} Nights</p>
              </div>
           </div>

           <div className="w-px h-12 bg-slate-100" />

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#138808]/5 flex items-center justify-center border border-[#138808]/10">
                <Zap className="w-7 h-7 text-[#138808]" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Total Odyssey</p>
                <p className="text-2xl font-black text-[#138808] uppercase tracking-tighter leading-none">₹{currentTotal.toLocaleString('en-IN')}</p>
              </div>
           </div>
        </div>

        {locationCheckText.length > 0 && (
          <div
            className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 space-y-2.5"
            role="region"
            aria-label="Location clarification"
          >
            <div className="flex gap-2.5">
              <Info className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 space-y-1 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9933]">Quick check</p>
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
                  className="px-5 py-2.5 rounded-xl bg-[#FF9933] hover:bg-orange-600 text-white text-xs font-black transition-all shadow-md shadow-saffron/20 active:scale-95"
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
          fNum={fNum}
          tNum={tNum}
          bNum={getNum(s.bus_cost)}
          ferryNum={getNum(s.ferry_cost)}
          hNum={hNum}
          taxiNum={taxiNum}
          otherNum={otherNum}
          isTaxiGrey={isTaxiGrey}
          currentPax={currentPax}
          nights={nights}
          currentRooms={currentRooms}
          fetchedRooms={fetchedRooms}
          active={activeTab}
          setActive={setActiveTab}
          tripType={inputs.tripType}
        />

        {/* Investment breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Investment Breakdown</h5>
            <div className="h-px flex-1 bg-slate-100 mx-6" />
          </div>
          
          <div className="space-y-3">
            {transportItems.filter(item => !((activeTab === 'air' && item.id === 'rail') || (activeTab === 'rail' && item.id === 'air'))).map((item, idx) => {
              const isNoData = !getNum(item.val) || item.val === 'N/A';
              const isGrey = isNoData;

              return (
                <div key={idx} className={`flex items-center justify-between p-5 rounded-3xl border border-slate-50 bg-slate-50/30 transition-all ${isGrey ? 'opacity-30 grayscale scale-95' : 'hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 hover:border-[#FF9933]/20 group/row'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isGrey ? 'bg-slate-100 text-slate-300' : (item.color === 'green' ? 'bg-[#138808]/10 text-[#138808]' : 'bg-[#FF9933]/10 text-[#FF9933]')}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isGrey ? 'text-slate-400' : 'text-[#FF9933]'}`}>{item.label}</p>
                      <p className={`text-base font-black uppercase tracking-tighter ${isGrey ? 'text-slate-500' : 'text-[#000080]'}`}>
                        {isNoData ? 'Data Sync Pending' : item.detail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black italic tracking-tighter ${isGrey ? 'text-slate-300' : 'text-[#000080]'}`}>
                      {isNoData ? '—' : formatPrice(item.val, item.pax, (item as any).isTransit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-orange-400 font-black uppercase">Safety</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.safety_score || 'Syncing...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <Heart className="w-3.5 h-3.5 text-saffron shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-saffron font-black uppercase">Tip</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.caring_tip || 'Syncing...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-saffron/5 px-2 py-2 rounded-lg border border-saffron/10">
            <Leaf className="w-3.5 h-3.5 text-green shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] text-green font-black uppercase">Eco</p>
              <p className="text-[10px] font-black text-saffron truncate uppercase italic">{s.sustainability_hint || 'Syncing...'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm(s, s.destination);
          }}
          className="w-full py-4 bg-[#FF9933] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-saffron/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Select Odyssey <ChevronRight className="w-4 h-4" />
        </button>
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
      className="space-y-2 md:landscape:space-y-1"
    >


      {/* Cards */}
      <div className="space-y-5">
        {(() => {
          const visibleSuggestions = suggestions.filter(s => {
            const budgetNum = Number(inputs.targetBudget) || 0;
            const priceNum = parseInt(String(s.totalPrice || '0').replace(/[₹,]/g, ''), 10);
            // Strict check: if no budget set, show all. If budget set, MUST be <= and must have a price.
            if (!budgetNum) return true;
            if (!priceNum) return false; // Hide if price is not yet available/syncing
            return priceNum <= budgetNum;
          });

          if (visibleSuggestions.length === 0 && suggestions.length > 0) {
            return (
              <div className="relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-gradient-to-br from-white to-orange-50/30 p-8 md:p-12 text-center shadow-2xl">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-saffron/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-green/5 rounded-full -ml-16 -mb-16 blur-3xl" />
                
                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-orange-100 flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-8 h-8 text-[#FF9933]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-[#000080] uppercase tracking-tighter italic">
                      REFINING <span className="text-saffron">ODYSSEY</span>...
                    </h3>
                    <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                      Our intelligence found matches, but they currently exceed your <span className="text-saffron font-bold">₹{Number(inputs.targetBudget).toLocaleString('en-IN')}</span> limit.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={onBack}
                      className="group relative px-8 py-3 bg-[#FF9933] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-saffron/20 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Adjust Investment <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                    
                    <button
                      onClick={onReset}
                      className="text-[10px] font-bold text-slate-400 hover:text-saffron uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <X className="w-3 h-3" /> or start a new quest
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return visibleSuggestions.map((s, i) => (
            <div key={i} className={`relative rounded-2xl transition-all ${selectedIdx === i ? 'ring-2 ring-saffron ring-offset-4 ring-offset-white' : ''}`}>
              {selectedIdx === i && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-saffron text-white text-[10px] font-black uppercase px-3 py-1 rounded-full z-10 shadow-lg italic">
                  Current Selection
                </div>
              )}
              <SuggestionCard 
                s={s} 
                i={i} 
                inputs={inputs} 
                fetchedInputs={fetchedInputs} 
                setInputs={setInputs} 
                onConfirm={onConfirm} 
                onAskAI={onAskAI} 
              />
            </div>
          ));
        })()}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest bg-[#138808] border border-green-600 px-8 py-4 rounded-2xl shadow-lg transition-all active:scale-95 hover:bg-green-800"
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
