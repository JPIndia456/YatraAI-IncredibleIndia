'use client';

import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
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
  Bus,
  Navigation,
  ArrowRight
} from 'lucide-react';
import type { PlannerInputs } from './StepInputs';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Tiers ─────────────────────────────────────────────────────────────── */
const TIERS = [
  { id: 'economy',  label: 'Economy',  sub: 'Budget',   color: 'text-orange-600', bg: 'bg-orange-50', multiplier: 0.85 },
  { id: 'moderate', label: 'Standard', sub: 'Balanced', color: 'text-saffron',    bg: 'bg-saffron/10', multiplier: 1.0 },
  { id: 'luxury',   label: 'Premium',  sub: 'Elite',    color: 'text-blue-600',   bg: 'bg-blue-50',    multiplier: 1.6 }
] as const;

interface SuggestionCardProps {
  s: any;
  i: number;
  inputs: PlannerInputs;
  fetchedInputs: { adults: number; kids: number } | null;
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  onConfirm: (s: any, dest: string, transportMode: string) => void;
  onAskAI: (dest: string) => void;
}

interface StepSuggestionsProps {
  suggestions: any[];
  inputs: PlannerInputs;
  fetchedInputs: { adults: number; kids: number } | null;
  selectedIdx: number | null;
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  onConfirm: (s: any, dest: string, transportMode: string) => void;
  onAskAI: (dest: string) => void;
  onBack: () => void;
  onReset: () => void;
  onGenerate: () => void;
  isLoading: boolean;
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

  const transportChoices = [
    { id: 'air', val: fTotal, icon: Plane, label: 'Flight', color: 'text-saffron' },
    { id: 'rail', val: tTotal, icon: Train, label: 'Train', color: 'text-amber-800' },
    { id: 'bus', val: bTotal, icon: Bus, label: 'Bus', color: 'text-orange-600' }
  ]; // Removed filter to ensure tabs are always visible

  const inr = (n: number) =>
    `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;

  const tabs = [];
  // Show Air tab if there is a flight cost OR if route distance justifies it (>= 150 km)
  // This ensures the tab always appears for long-haul routes even if AI price is pending
  tabs.push({ id: 'air', label: 'Air', total: gFlight, icon: Plane, color: 'text-[#FF9933]', bg: 'bg-[#FF9933]/10' });
  if (tNum > 0) tabs.push({ id: 'rail', label: 'Rail', total: gTrain, icon: Train, color: 'text-amber-800', bg: 'bg-amber-800/15' });
  if (bNum > 0) tabs.push({ id: 'bus', label: 'Bus', total: gBus, icon: Bus, color: 'text-[#138808]', bg: 'bg-[#138808]/10' });
  if (ferryNum > 0) tabs.push({ id: 'ferry', label: 'Ferry', total: gFerry, icon: Ship, color: 'text-blue-600', bg: 'bg-blue-50' });

  const cur = tabs.find(foundTab => foundTab.id === active) || tabs[0];
  if (!cur) return null;

  let lineItems = [];
  const activeIcon = active === 'air' ? Plane : (active === 'rail' ? Train : (active === 'ferry' ? Ship : Bus));
  const activeLabel = active === 'air' ? 'Flight' : (active === 'rail' ? 'Train' : (active === 'ferry' ? 'Ferry' : 'Bus'));
  const activeVal = active === 'air' ? fTotal : (active === 'rail' ? tTotal : (active === 'ferry' ? ferryTotal : bTotal));
  const activeColor = active === 'air' ? 'text-[#FF9933]' : (active === 'rail' ? 'text-amber-800' : (active === 'ferry' ? 'text-blue-600' : 'text-[#138808]'));

  const activeBg = active === 'air' ? 'bg-[#FF9933]/10' : (active === 'rail' ? 'bg-amber-800/15' : (active === 'ferry' ? 'bg-blue-50' : 'bg-[#138808]/10'));

  lineItems = [
    { 
      icon: activeIcon, 
      label: `${activeLabel} (${currentPax} pax, ${isRound ? 'RT' : 'OW'})`, 
      val: activeVal, 
      color: activeColor,
      bg: activeBg,
      pax: currentPax
    },
    { icon: Hotel, label: `Stay (${nights}N, ${currentRooms} rooms)`, val: hTotal, color: 'text-green', bg: 'bg-green/10', pax: currentPax },
  ];

  return (
    <div className="bg-slate-50/80 border border-slate-200/50 rounded-[2rem] p-5 space-y-4 shadow-inner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Valuation Threshold</p>
        <div className="flex flex-wrap bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-sm">
          {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={e => { e.stopPropagation(); setActive(tab.id); }}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active === tab.id ? `${tab.bg} ${tab.color} shadow-sm ring-1 ring-inset ring-current/10` : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-black text-[#000080] leading-none tracking-tighter italic">{inr(cur.total)}</p>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Total</span>
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-200/50">
        {lineItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${item.bg || 'bg-white'} border border-slate-100 flex items-center justify-center shadow-sm`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-[#000080] uppercase tracking-tighter truncate">{item.label}</p>
                {item.val > 0 && (
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    ₹{(item.val / (item.pax || 1)).toLocaleString()} / PAX
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs font-black text-saffron italic">{inr(item.val)}</p>
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
  const [activeTab, setActiveTab] = useState<string>(
    () => getNum(undefined) >= 0 ? 'air' : 'rail'
  );
  const { t } = useLanguage();

  const locationCheckText = typeof s.location_check === 'string' ? s.location_check.trim() : '';
  
  const fNum = getNum(s.flight_cost);
  const tNum = getNum(s.train_cost);
  const bNum = getNum(s.bus_cost);
  const ferryNum = getNum(s.ferry_cost);
  const hNum = getNum(s.hotel_per_night);
  const taxiNum = getNum(s.taxi_cost);
  const otherNum = getNum(s.other_transport_cost);
  const isTaxiGrey = fNum > 0 && tNum > 0;

  useEffect(() => {
    setLocationCheckAnswer(null);
    // Pick the best default tab based on available data and distance
    const distanceOk = !s.distance_km || s.distance_km >= 150;
    if (fNum > 0 && distanceOk) setActiveTab('air');
    else if (tNum > 0) setActiveTab('rail');
    else if (bNum > 0) setActiveTab('bus');
    else if (ferryNum > 0) setActiveTab('ferry');
    else setActiveTab('rail'); // safe fallback
  }, [locationCheckText, fNum, tNum, bNum, ferryNum, s.distance_km]);

  const startMs = new Date(inputs.startDate).getTime();
  const endMs = new Date(inputs.endDate).getTime();
  const daySpan = (endMs - startMs) / (1000 * 60 * 60 * 24);
  const nights =
    Number.isFinite(daySpan) && daySpan > 0 ? Math.max(1, Math.ceil(daySpan)) : 1;
  const currentPax =
    Math.max(1, Math.floor(Number(inputs.adults)) || 1) + Math.max(0, Math.floor(Number(inputs.kids)) || 0);
  const currentRooms = calculateRooms(inputs.adults, inputs.kids);
  const fetchedRooms = calculateRooms(fetchedInputs?.adults || 2, fetchedInputs?.kids || 0);

  const tierMultiplier = TIERS.find(t => t.id === (inputs.budget || 'moderate'))?.multiplier || 1.0;
  const fTotal = fNum * currentPax * (activeTab === 'air' ? tierMultiplier : 1.0);
  const tTotal = tNum * currentPax;
  const bTotal = bNum * currentPax;
  const ferryTotal = ferryNum * currentPax;
  const hTotal = Math.round((hNum * tierMultiplier) / (fetchedRooms || 1)) * currentRooms * nights;

  const currentTotal = useMemo(() => {
    if (activeTab === 'air') return fTotal + hTotal;
    if (activeTab === 'rail') return tTotal + hTotal;
    if (activeTab === 'bus') return bTotal + hTotal;
    if (activeTab === 'ferry') return ferryTotal + hTotal;
    if (activeTab === 'mix') return (fTotal / 2) + (tTotal / 2) + hTotal;
    return fTotal + hTotal;
  }, [activeTab, fTotal, tTotal, bTotal, ferryTotal, hTotal]);

  const isRound = inputs.tripType === 'round';

  const formatPrice = (str?: string | number | null, pax = 1, _isTransit = false) => {
    const n = getNum(str);
    if (!n || str === 'N/A') return '—';
    const line = n * pax;
    if (!Number.isFinite(line)) return '—';
    return `₹${line.toLocaleString('en-IN')}`;
  };

  const transportItems = [
    { id: 'air', icon: Plane, label: `Flight${isRound ? ' (Return)' : ''}`, val: s.flight_cost, pax: currentPax, color: 'saffron', detail: `${inputs.budget === 'luxury' ? 'Premier Cabin' : 'Value Class'} • ${s.flight_name || s.nearest_airport || 'Standard Air'} • ${formatPrice(s.flight_cost, 1)}/Pax`, isTransit: true },
    { id: 'rail', icon: Train, label: `Train${isRound ? ' (Return)' : ''}`, val: s.train_cost, pax: currentPax, color: 'saffron', detail: `${inputs.budget === 'luxury' ? 'AC Express' : 'Sleeper Class'} • ${s.train_name || s.nearest_railway || 'Express Rail'} • ${formatPrice(s.train_cost, 1)}/Pax`, isTransit: true },
    { id: 'bus', icon: Bus, label: `Bus${isRound ? ' (Return)' : ''}`, val: s.bus_cost, pax: currentPax, color: 'saffron', detail: `${inputs.budget === 'luxury' ? 'Volvo Multi-Axle' : 'Standard Express'} • ${s.bus_operator || 'RedBus Express'} • ${formatPrice(s.bus_cost, 1)}/Pax`, isTransit: true },
    { id: 'ferry', icon: Ship, label: 'Ferry Crossing', val: s.ferry_cost, pax: currentPax, color: 'saffron', detail: `${inputs.budget === 'luxury' ? 'Luxury Cruise' : 'Local Ferry'} • ${s.ferry_note || 'Coastal Ferry'} • ${formatPrice(s.ferry_cost, 1)}/Pax`, isTransit: true },
    { id: 'hotel', icon: Hotel, label: 'Hotel/night', val: s.hotel_per_night, pax: 1, color: 'saffron', detail: `${inputs.budget === 'luxury' ? '5-Star Heritage' : inputs.budget === 'economy' ? 'Value Stay' : 'Premium Stay'} • ${s.hotel_location || s.destination || 'Prime Area'}`, isTransit: false },
  ].filter(item => {
    // Only hide Air on genuinely short-haul routes (< 150 km)
    // Do NOT hide Air just because the AI returned 'N/A' — show it grayed out instead
    if (item.id === 'air' && s.distance_km && s.distance_km < 150) return false;
    if (['rail', 'bus', 'hotel'].includes(item.id)) return true;
    if (item.id === 'ferry' && (!s.ferry_cost || s.ferry_cost === 'N/A' || s.ferry_cost === 0)) return false;
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

      <div 
        onClick={() => onConfirm(s, s.destination, activeTab)}
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
              {s.distance_km && (
                <div className="flex items-center gap-2 bg-saffron/5 px-2 py-0.5 rounded-full border border-saffron/10">
                  <Navigation className="w-3 h-3 text-saffron shrink-0" />
                  <p className="text-[10px] font-black text-saffron uppercase tracking-widest">{s.distance_km} kms</p>
                </div>
              )}
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


        {/* Tier selector removed per user request */}

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
          
          <div className="space-y-2">
            {transportItems.filter(item => {
              if (item.id === 'hotel') return true;
              return item.id === activeTab;
            }).map((item, idx) => {
              const isNoData = !getNum(item.val) || item.val === 'N/A';
              const isGrey = isNoData;

              return (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white transition-all ${isGrey ? 'opacity-30 grayscale scale-95' : 'hover:shadow-xl hover:shadow-slate-200/30 hover:border-saffron/20 group/row shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isGrey ? 'bg-slate-50 text-slate-300' : (item.id === 'hotel' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${isGrey ? 'text-slate-400' : 'text-slate-400'}`}>{item.label}</p>
                      <p className={`text-sm font-black uppercase tracking-tighter leading-tight ${isGrey ? 'text-slate-500' : 'text-[#000080]'}`}>
                        {isNoData ? 'Data Sync Pending' : item.detail.split(' • ')[0]}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 truncate max-w-[180px]">{item.detail.split(' • ').slice(1).join(' • ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black italic tracking-tighter ${isGrey ? 'text-slate-300' : 'text-[#000080]'}`}>
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

        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAI?.(s);
            }}
            className="flex-1 py-4 bg-white border-2 border-slate-100 text-[#000080] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-saffron/20 transition-all flex items-center justify-center gap-2 active:scale-95 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-saffron group-hover:animate-pulse" /> Ask AI
          </button>
          
          <button
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(s, s.destination, activeTab);
            }}
            className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2
              ${isLoading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-[#FF9933] text-white shadow-lg shadow-saffron/20 hover:scale-[1.02] active:scale-95 cursor-pointer'
              }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                <span>Securing...</span>
              </>
            ) : (
              <>
                Secure this Odyssey <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </motion.div>
  );
}

/* ── StepSuggestions ────────────────────────────────────────────────────── */
export default function StepSuggestions({
  suggestions, inputs, fetchedInputs, selectedIdx, setInputs,
  onConfirm, onAskAI, onBack, onReset, onGenerate, isLoading
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
      {/* Cards */}
      <div className="space-y-5">
        {(() => {
          const visibleSuggestions = suggestions.filter(s => {
            const budgetNum = Number(inputs.targetBudget) || 0;
            const priceNum = parseInt(String(s.totalPrice || '0').replace(/[₹,]/g, ''), 10);
            if (!budgetNum) return true;
            if (!priceNum) return true; // No price data → always show, can't filter what we don't know
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
                      onClick={onGenerate}
                      disabled={isLoading}
                      className={`group relative overflow-hidden py-5 px-12 rounded-full font-black text-sm uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl ${
                        isLoading 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-saffron via-white to-green text-[#000080] hover:shadow-saffron/40'
                      }`}
                    >
                      <div className="relative z-10 flex items-center gap-3">
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                            <span>Drafting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-saffron animate-pulse" />
                            <span>{t('suggestions_generate_btn')}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </button>
                    
                    <button
                      onClick={onBack}
                      className="group relative px-8 py-3 bg-[#FF9933] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-saffron/20 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {t('adjust_investment') || 'Adjust Investment'} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
