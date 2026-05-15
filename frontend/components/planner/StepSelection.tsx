'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Sparkles, MapPin, Calendar, Wallet, Users, 
  ArrowRight, Plane, Train, Hotel, Car, Info, ChevronDown, ChevronUp, Ship, Bus, Search
} from 'lucide-react';
import { useTripStore, useTripPlannerStore, useTourGuideStore } from '@/lib/store';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepSelectionProps {
  onConfirm: () => void;
  onBack: () => void;
  onUpdateParams?: () => void;
}

export default function StepSelection({ onConfirm, onBack, onUpdateParams }: StepSelectionProps) {
  const { t } = useLanguage();
  const { activeItinerary, searchData, mixPicks, setMixPicks } = useTripPlannerStore();
  const { patchTourGuide } = useTourGuideStore();
  const { adults, kids, targetBudget, origin, startDate, endDate } = useTripStore();
  // Round trip = user has both a departure and a return date
  const isRoundTrip = !!(endDate && endDate !== startDate);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const parsePrice = (p?: string): number => {
    if (!p) return 0;
    return parseInt(String(p).replace(/[₹,]/g, '')) || 0;
  };

  const totalPax = adults + kids;

  if (!activeItinerary) return null;

  const nights = activeItinerary.nights || 1;
  // Room logic: 1 room per 2 adults (kids up to 2 share with adults)
  const roomsNeeded = Math.max(1, Math.ceil(adults / 2));
  const tp = parsePrice(mixPicks.transport?.price);
  const rtp = parsePrice(mixPicks.returnTransport?.price);
  const hp = parsePrice(mixPicks.hotel?.price);
  const liveTotal = ((tp + rtp) * totalPax) + (hp * nights * roomsNeeded);

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const SectionHeader = ({ id, icon: Icon, title, count, variant = 'orange' }: any) => {
    const colors: any = {
      blue: 'bg-blue-50 border-blue-100 text-blue-600',
      green: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      orange: 'bg-orange-50 border-orange-100 text-orange-600',
      purple: 'bg-purple-50 border-purple-100 text-purple-600'
    };
    const activeColors: any = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    
    const currentTheme = expandedSection === id ? activeColors[variant] : colors[variant];

    return (
      <button
        onClick={() => toggleSection(id)}
        className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all group ${currentTheme}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${expandedSection === id ? 'bg-white/50' : 'bg-white/30'} transition-colors`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black uppercase tracking-tight italic">{title}</p>
            <p className={`text-xs font-bold uppercase tracking-widest opacity-70`}>
              <span className="font-black">{count}</span> {t('selection_studio_options_available')}
            </p>
          </div>
        </div>
        {expandedSection === id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-5xl mx-auto px-4"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-orange-100 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-saffron">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">{t('selection_studio_subtitle')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic leading-none">
            <span className="text-saffron">{t('selection_studio_title').split(' ')[0]}</span> 
            <span className="text-slate-400 mx-2">{t('selection_studio_title').split(' ')[1]}</span> 
            <span className="text-[#138808]">{t('selection_studio_title').split(' ').slice(2).join(' ')}</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
           <div className="text-right">
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('selection_studio_target')}</p>
             <p className="text-base font-black text-saffron">₹{targetBudget.toLocaleString('en-IN')}</p>
           </div>
           <div className="w-px h-6 bg-orange-200" />
           <div className="text-right">
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Party</p>
             <p className="text-base font-black text-[#000080]">{adults + kids} PAX</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Options List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget & Adjustment Card */}
          <div className="shell-panel p-6 bg-white border-orange-100 shadow-sm space-y-4 rounded-[2rem]">
            <p className="text-xs text-slate-600 leading-relaxed font-medium italic border-l-2 border-saffron/30 pl-4">
              {t('selection_studio_logic_memo', { tier: activeItinerary.tierLabel, adults, kids })}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-black uppercase tracking-widest ml-1">{t('selection_studio_target_budget')}</label>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                  <button onClick={() => useTripStore.getState().setTargetBudget(Math.max(10000, targetBudget - 5000))} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-saffron hover:bg-orange-50 transition-all font-black">−</button>
                  <span className="text-sm font-black text-saffron">₹{targetBudget.toLocaleString()}</span>
                  <button onClick={() => useTripStore.getState().setTargetBudget(targetBudget + 5000)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-saffron hover:bg-orange-50 transition-all font-black">+</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-black uppercase tracking-widest ml-1">{t('selection_studio_travel_party')}</label>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                  <button onClick={() => useTripStore.getState().setTravelers(Math.max(1, adults - 1), kids)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-saffron hover:bg-orange-50 transition-all font-black">−</button>
                  <span className="text-sm font-black text-[#000080]">{adults} Adults</span>
                  <button onClick={() => useTripStore.getState().setTravelers(adults + 1, kids)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-saffron hover:bg-orange-50 transition-all font-black">+</button>
                </div>
              </div>
            </div>
            {onUpdateParams && (
              <button onClick={onUpdateParams} className="w-full py-3.5 bg-orange-50 hover:bg-orange-100 text-saffron rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all">
                {t('selection_studio_update_plan')}
              </button>
            )}
          </div>

          <div className="space-y-3">

            {/* ── Route Context Banner ─────────────────────────────── */}
            <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-saffron shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-black text-[#000080] uppercase">{origin || activeItinerary?.from || 'Origin'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-saffron" />
                  <span className="text-sm font-black text-saffron uppercase">{activeItinerary?.to || activeItinerary?.destination || 'Destination'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-widest">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>Depart: <span className="text-[#000080]">{startDate || activeItinerary?.startDate || '—'}</span></span>
                </div>
                {isRoundTrip && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Return: <span className="text-[#000080]">{endDate || activeItinerary?.endDate || '—'}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-3 h-3 text-purple-400" />
                  <span><span className="text-[#000080]">{adults + kids} Pax</span> · {activeItinerary?.nights || 1} Nights</span>
                </div>
              </div>
            </div>

            {/* ── OUTBOUND: Origin → Destination ───────────────────── */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-blue-100" />
              <span className="text-xs font-black uppercase text-blue-500 truncate max-w-[55%]">
                ✈ {(origin || activeItinerary?.from || 'Origin').slice(0,12)} → {(activeItinerary?.to || 'Dest').slice(0,12)} · {startDate || activeItinerary?.startDate || 'Depart'}
              </span>
              <div className="flex-1 h-px bg-blue-100" />
            </div>

            {/* 1. Flights */}
            {searchData.flights?.length > 0 && (
            <div className="space-y-2">
              <SectionHeader id="flights" icon={Plane} title={t('selection_studio_air_options')} count={searchData.flights.length} variant="blue" />
              <AnimatePresence>
                {expandedSection === 'flights' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {(searchData.flights?.length ? [...searchData.flights].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)) : []).map((f: any, i: number) => {
                            const tp = mixPicks.transport as any;
                            const isSelected = tp?.type === 'Flight' && tp?.departure === f.departure && tp?.price === f.price;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ transport: { ...f, type: 'Flight' } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-blue-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Plane className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-blue-600' : 'text-[#000080]'}`}>{f.airline || f.name}</p>
                                      <p className="text-xs text-slate-400 font-bold uppercase">{f.flight || 'FLIGHT'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-blue-200 text-center">
                                  <p className="text-xs font-black text-[#000080]">{f.departure} → {f.arrival}</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase">{f.duration || '2h 30m'}</p>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-blue-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{f.price}</span>
                                    <button className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                       isSelected ? 'bg-emerald-500 text-white' : 'bg-saffron/10 text-saffron border border-saffron/30 hover:bg-saffron hover:text-white'
                                     }`}>{isSelected ? '✓ Added' : '+ Add'}</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* 2. Trains */}
            {searchData.trains?.length > 0 && (
            <div className="space-y-2">
              <SectionHeader id="trains" icon={Train} title={t('selection_studio_rail_options')} count={searchData.trains.length} variant="purple" />
              <AnimatePresence>
                {expandedSection === 'trains' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {(searchData.trains?.length ? [...searchData.trains].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)) : []).map((t: any, i: number) => {
                            const tp = mixPicks.transport as any;
                            const isSelected = tp?.type === 'Train' && tp?.name === (t.name || t.train_name) && tp?.price === t.price;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ transport: { ...t, type: 'Train', name: t.name || t.train_name } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-purple-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-purple-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Train className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-purple-600' : 'text-[#000080]'}`}>{t.name || t.train_name}</p>
                                      <p className="text-xs text-slate-400 font-bold uppercase">{t.class || 'CLASS'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-purple-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{t.price}</span>
                                    <button className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                       isSelected ? 'bg-emerald-500 text-white' : 'bg-saffron/10 text-saffron border border-saffron/30 hover:bg-saffron hover:text-white'
                                     }`}>{isSelected ? '✓ Added' : '+ Add'}</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* 3. Buses */}
            {searchData.buses?.length > 0 && (
            <div className="space-y-2">
              <SectionHeader id="buses" icon={Bus} title="Bus Options" count={searchData.buses.length} variant="orange" />
              <AnimatePresence>
                {expandedSection === 'buses' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {(searchData.buses?.length ? [...searchData.buses].sort((a,b) => (a.priceNum || 0) - (b.priceNum || 0)) : []).map((b: any, i: number) => {
                            const tp = mixPicks.transport as any;
                            const isSelected = tp?.type === 'Bus' && tp?.name === b.operator && tp?.price === b.price;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ transport: { ...b, type: 'Bus', name: b.operator } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-orange-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Bus className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-orange-600' : 'text-[#000080]'}`}>{b.operator}</p>
                                      <p className="text-xs text-slate-400 font-bold uppercase">{b.type || 'BUS'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-orange-200 text-center">
                                  <p className="text-xs font-black text-[#000080]">{b.departure} → {b.arrival}</p>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-orange-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{b.price}</span>
                                    <button className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                       isSelected ? 'bg-emerald-500 text-white' : 'bg-saffron/10 text-saffron border border-saffron/30 hover:bg-saffron hover:text-white'
                                     }`}>{isSelected ? '✓ Added' : '+ Add'}</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* 4. Ferries / Crossings */}
            {searchData.ferries?.length > 0 && (
            <div className="space-y-2">
              <SectionHeader id="ferries" icon={Ship} title={t('selection_studio_ferry_options')} count={searchData.ferries.length} variant="blue" />
              <AnimatePresence>
                {expandedSection === 'ferries' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {(searchData.ferries?.length ? [...searchData.ferries] : []).map((f: any, i: number) => {
                            const tp = mixPicks.transport as any;
                            const isSelected = tp?.type === 'Ferry' && tp?.name === f.name && tp?.price === f.price;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ transport: { ...f, type: 'Ferry' } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-blue-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Ship className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-blue-600' : 'text-[#000080]'}`}>{f.name}</p>
                                      <p className="text-xs text-slate-400 font-bold uppercase">WATERWAY</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-blue-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{f.price}</span>
                                    <button className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                       isSelected ? 'bg-emerald-500 text-white' : 'bg-saffron/10 text-saffron border border-saffron/30 hover:bg-saffron hover:text-white'
                                     }`}>{isSelected ? '✓ Added' : '+ Add'}</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* ── STAYS at Destination ─────────────────────────── */}
            <div className="flex items-center gap-2 px-1 pt-2">
              <div className="flex-1 h-px bg-emerald-100" />
              <span className="text-xs font-black uppercase text-emerald-600 truncate max-w-[55%]">
                🏨 Stay in {(activeItinerary?.to || 'Destination').slice(0,14)} · {activeItinerary?.nights || 1} Nights
              </span>
              <div className="flex-1 h-px bg-emerald-100" />
            </div>

            {/* 5. Stays */}
            {searchData.hotels?.length > 0 && (
            <div className="space-y-2">
              <SectionHeader id="hotels" icon={Hotel} title={t('selection_studio_stay_options')} count={searchData.hotels.length} variant="green" />
              <AnimatePresence>
                {expandedSection === 'hotels' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {(searchData.hotels?.length ? [...searchData.hotels].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)) : []).map((h: any, i: number) => {
                            const hp = mixPicks.hotel;
                            const isSelected = hp?.name === h.name && hp?.price === h.price;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ hotel: h })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-emerald-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Hotel className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div>
                                      <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-emerald-600' : 'text-[#000080]'}`}>{h.name}</p>
                                      <p className="text-xs text-slate-400 font-bold uppercase">{h.location || h.area || 'STAY'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-emerald-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <div className="text-right">
                                       <span className="text-sm font-black text-[#000080]">{h.price}/N</span>
                                       {roomsNeeded > 1 && <p className="text-[8px] text-amber-500 font-bold">{roomsNeeded} rooms</p>}
                                    </div>
                                    <button className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                       isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white'
                                     }`}>{isSelected ? '✓ Added' : '+ Add'}</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* 6. Return Journey — shown only for round trips */}
            {isRoundTrip && (searchData.flights?.length > 0 || searchData.trains?.length > 0 || searchData.buses?.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 pt-2">
                <div className="flex-1 h-px bg-orange-100" />
                <span className="text-xs font-black uppercase text-saffron">↩ Return Journey</span>
                <div className="flex-1 h-px bg-orange-100" />
              </div>
              {searchData.flights?.length > 0 && (
              <div className="space-y-2">
                <SectionHeader id="return-flights" icon={Plane} title="Return Flight" count={searchData.flights.length} variant="blue" />
                <AnimatePresence>
                  {expandedSection === 'return-flights' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {[...searchData.flights].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)).map((f: any, i: number) => {
                            const rtp = mixPicks.returnTransport as any;
                            const isSelected = rtp?.type === 'Flight' && rtp?.price === f.price && rtp?.isReturn;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ returnTransport: { ...f, type: 'Flight', isReturn: true } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-blue-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Plane className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-blue-600' : 'text-[#000080]'}`}>{f.airline || f.name}</p>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-blue-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{f.price}</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-200'}`}>
                                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
              {searchData.trains?.length > 0 && (
              <div className="space-y-2">
                <SectionHeader id="return-trains" icon={Train} title="Return Train" count={searchData.trains.length} variant="purple" />
                <AnimatePresence>
                  {expandedSection === 'return-trains' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {[...searchData.trains].map((t: any, i: number) => {
                            const rtp = mixPicks.returnTransport as any;
                            const isSelected = rtp?.type === 'Train' && rtp?.name === (t.name || t.train_name) && rtp?.isReturn;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ returnTransport: { ...t, type: 'Train', name: t.name || t.train_name, isReturn: true } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-purple-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-purple-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Train className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-purple-600' : 'text-[#000080]'}`}>{t.name || t.train_name}</p>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-purple-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{t.price}</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-200'}`}>
                                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
              {searchData.buses?.length > 0 && (
              <div className="space-y-2">
                <SectionHeader id="return-buses" icon={Bus} title="Return Bus" count={searchData.buses.length} variant="orange" />
                <AnimatePresence>
                  {expandedSection === 'return-buses' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto custom-scrollbar pt-2 px-1">
                      <table className="w-full border-separate border-spacing-y-1.5">
                        <tbody>
                          {[...searchData.buses].map((b: any, i: number) => {
                            const rtp = mixPicks.returnTransport as any;
                            const isSelected = rtp?.type === 'Bus' && rtp?.name === b.operator && rtp?.isReturn;
                            return (
                              <tr key={i} onClick={() => setMixPicks({ returnTransport: { ...b, type: 'Bus', name: b.operator, isReturn: true } })}
                                className={`group cursor-pointer transition-all ${isSelected ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="py-3 pl-4 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-orange-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                      <Bus className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <p className={`text-xs font-black uppercase truncate max-w-[10rem] ${isSelected ? 'text-orange-600' : 'text-[#000080]'}`}>{b.operator}</p>
                                  </div>
                                </td>
                                <td className="py-3 border-y border-slate-100 group-hover:border-orange-200 text-right pr-4 rounded-r-2xl border-r">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-sm font-black text-[#000080]">{b.price}</span>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-200'}`}>
                                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
            </div>
            )}

            {searchData.flights?.length === 0 && searchData.trains?.length === 0 && 
             searchData.buses?.length === 0 && searchData.ferries?.length === 0 && 
             searchData.hotels?.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">Scouring live options...</p>
                  <p className="text-slate-500 text-sm mt-1 italic">Finding the best Flights, Trains, and Stays for {activeItinerary.destination} on {activeItinerary.startDate || 'your dates'}.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Amazon Summary Sidebar */}
        <div className="lg:col-span-1 sticky top-24 space-y-4">
          <div className="shell-panel p-6 space-y-6 bg-white shadow-2xl border-orange-100 rounded-[2.5rem]">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Odyssey Summary</h3>
              <p className="text-xs font-bold text-slate-300 uppercase">{activeItinerary.duration} · {activeItinerary.destination}</p>
            </div>
            
            <div className="space-y-4">
              {/* Transport Pick */}
              <div className="flex gap-4 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner 
                  ${mixPicks.transport?.type === 'Flight' ? 'bg-blue-50 text-blue-600' : 
                    mixPicks.transport?.type === 'Train' ? 'bg-purple-50 text-purple-600' : 
                    mixPicks.transport?.type === 'Bus' ? 'bg-orange-50 text-orange-600' : 
                    'bg-slate-50 text-slate-400'}`}>
                  {mixPicks.transport?.type === 'Flight' ? <Plane className="w-5 h-5" /> : 
                   mixPicks.transport?.type === 'Train' ? <Train className="w-5 h-5" /> : 
                   mixPicks.transport?.type === 'Bus' ? <Bus className="w-5 h-5" /> : 
                   <Car className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">{mixPicks.transport?.type || 'Transport'}</p>
                  <p className="text-sm font-bold text-[#000080] truncate leading-tight mt-0.5">{mixPicks.transport?.name || mixPicks.transport?.airline || 'Not Selected'}</p>
                  {mixPicks.transport?.price && (
                    <p className="text-xs font-black text-saffron mt-1">
                      {mixPicks.transport.price}/pax × {totalPax} = ₹{(parsePrice(mixPicks.transport.price) * totalPax).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Return Transport Pick — shown for round trips */}
              {isRoundTrip && (
              <div className="flex gap-4 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner
                  ${mixPicks.returnTransport?.type === 'Flight' ? 'bg-blue-50 text-blue-600' :
                    mixPicks.returnTransport?.type === 'Train' ? 'bg-purple-50 text-purple-600' :
                    mixPicks.returnTransport?.type === 'Bus' ? 'bg-orange-50 text-orange-600' :
                    'bg-slate-50 text-slate-400'}`}>
                  {mixPicks.returnTransport?.type === 'Flight' ? <Plane className="w-5 h-5" /> :
                   mixPicks.returnTransport?.type === 'Train' ? <Train className="w-5 h-5" /> :
                   mixPicks.returnTransport?.type === 'Bus' ? <Bus className="w-5 h-5" /> :
                   <ArrowRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">Return {mixPicks.returnTransport?.type || 'Transport'}</p>
                  <p className="text-sm font-bold text-[#000080] truncate leading-tight mt-0.5">{mixPicks.returnTransport?.name || mixPicks.returnTransport?.airline || 'Not Selected'}</p>
                  {mixPicks.returnTransport?.price && (
                    <p className="text-xs font-black text-saffron mt-1">
                      {mixPicks.returnTransport.price}/pax × {totalPax} = ₹{(parsePrice(mixPicks.returnTransport.price) * totalPax).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Stay Pick */}
              <div className="flex gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                  <Hotel className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">Stay</p>
                  <p className="text-sm font-bold text-[#000080] truncate leading-tight mt-0.5">{mixPicks.hotel?.name || 'Not Selected'}</p>
                  {mixPicks.hotel?.price && (
                    <p className="text-xs font-black text-emerald-600 mt-1">
                      {mixPicks.hotel.price}/night × {nights}N{roomsNeeded > 1 ? ` × ${roomsNeeded} rooms` : ''} = ₹{(parsePrice(mixPicks.hotel.price) * nights * roomsNeeded).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Itemised Breakdown + Total */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              {/* Line items */}
              <div className="space-y-1.5 text-xs font-bold text-slate-500">
                {mixPicks.transport?.price && (
                  <div className="flex justify-between">
                    <span>Outbound ({mixPicks.transport.type})</span>
                    <span className="text-[#000080]">₹{(parsePrice(mixPicks.transport.price) * totalPax).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {isRoundTrip && mixPicks.returnTransport?.price && (
                  <div className="flex justify-between">
                    <span>Return ({mixPicks.returnTransport.type})</span>
                    <span className="text-[#000080]">₹{(parsePrice(mixPicks.returnTransport.price) * totalPax).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {mixPicks.hotel?.price && (
                  <div className="flex justify-between">
                    <span>Hotel ({nights}N{roomsNeeded > 1 ? `, ${roomsNeeded} rooms` : ''})</span>
                    <span className="text-[#000080]">₹{(parsePrice(mixPicks.hotel.price) * nights * roomsNeeded).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {roomsNeeded > 1 && (
                  <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                    <span className="text-amber-500 text-xs">⚠</span>
                    <p className="text-xs text-amber-700 font-bold leading-snug">
                      {roomsNeeded} rooms recommended for {adults} adults ({Math.ceil(adults/2)} × 2-adult occupancy)
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400 pt-0.5 border-t border-dashed border-slate-100">
                  <span>{totalPax} pax · {nights} nights</span>
                  <span>incl. all taxes (est.)</span>
                </div>
              </div>
              {/* Grand Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-[#000080] italic">₹{(liveTotal > 0 ? liveTotal : (activeItinerary.totalNum || 0)).toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={onConfirm}
                disabled={!mixPicks.transport || !mixPicks.hotel}
                className="w-full py-4 bg-gradient-to-r from-saffron to-orange-600 disabled:from-slate-100 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
              {!mixPicks.transport || !mixPicks.hotel ? (
                <p className="text-xs text-center text-orange-400 font-bold uppercase italic animate-pulse">Select transport & stay to proceed</p>
              ) : null}
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-4 text-[#138808] hover:text-green-800 font-black text-xs uppercase tracking-[0.2em] transition-all text-center"
          >
            ← Adjust Odyssey Parameters
          </button>
        </div>

      </div>
    </motion.div>
  );
}
