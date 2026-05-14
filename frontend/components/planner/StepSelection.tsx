'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Sparkles, MapPin, Calendar, Wallet, Users, 
  ArrowRight, Plane, Train, Hotel, Car, Info, ChevronDown, ChevronUp, Ship
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
  const { adults, kids, targetBudget } = useTripStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!activeItinerary) return null;

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
            <p className="text-xs font-black uppercase tracking-tight italic">{title}</p>
            <p className={`text-[9px] font-bold uppercase tracking-widest opacity-70`}>
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
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-saffron/10 flex items-center justify-center mx-auto border border-saffron/20 shadow-inner">
          <Sparkles className="w-8 h-8 text-saffron" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">
          <span className="text-saffron">{t('selection_studio_title').split(' ')[0]}</span> <span className="text-slate-400 mx-1">{t('selection_studio_title').split(' ')[1]}</span> <span className="text-green">{t('selection_studio_title').split(' ').slice(2).join(' ')}</span>
        </h2>
        <p className="text-caption">{t('selection_studio_subtitle')}</p>
      </div>

      {/* --- Budget Transparency & Adjustment --- */}
      <div className="shell-panel p-5 bg-orange-50 border-saffron/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-saffron">
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('selection_studio_budget_report')}</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] text-slate-400 font-bold uppercase">{t('selection_studio_target')}:</span>
             <span className="text-xs font-black text-saffron">₹{targetBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic border-l-2 border-saffron/30 pl-4 py-1">
          {t('selection_studio_logic_memo', { tier: activeItinerary.tierLabel, adults, kids })}
        </p>
        
        {/* Adjustment Controls */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('selection_studio_adjust_experience')}</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t('selection_studio_target_budget')}</label>
                 <div className="flex items-center justify-between bg-white/40 rounded-xl p-2 border border-orange-100">
                    <button onClick={() => useTripStore.getState().setTargetBudget(Math.max(10000, targetBudget - 5000))} className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-saffron hover:bg-orange-100 transition-all">−</button>
                    <span className="text-xs font-black text-saffron">₹{targetBudget.toLocaleString()}</span>
                    <button onClick={() => useTripStore.getState().setTargetBudget(targetBudget + 5000)} className="w-8 h-8 rounded-lg bg-saffron/10 flex items-center justify-center text-saffron hover:bg-saffron/20 transition-all">+</button>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t('selection_studio_travel_party')}</label>
                 <div className="flex items-center justify-between bg-white/40 rounded-xl p-2 border border-orange-100">
                    <button onClick={() => useTripStore.getState().setTravelers(Math.max(1, adults - 1), kids)} className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-saffron hover:bg-orange-100 transition-all">−</button>
                    <span className="text-xs font-black text-[#000080]"><span className="text-saffron">{adults}</span> {t('selection_studio_adults')}</span>
                    <button onClick={() => useTripStore.getState().setTravelers(adults + 1, kids)} className="w-8 h-8 rounded-lg bg-saffron/10 flex items-center justify-center text-saffron hover:bg-saffron/20 transition-all">+</button>
                 </div>
              </div>
           </div>
           <button onClick={() => onUpdateParams ? onUpdateParams() : onBack()} className="w-full py-4 bg-gradient-to-r from-saffron via-white to-green border border-orange-100 rounded-xl text-sm font-black text-[#000080] uppercase tracking-widest transition-all shadow-md">
              {t('selection_studio_update_plan')}
           </button>
        </div>
      </div>

      {/* --- Options List --- */}
      <div className="space-y-3">
        {/* 1. Flights */}
        {searchData.flights?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader id="flights" icon={Plane} title={t('selection_studio_air_options')} count={searchData.flights.length} variant="blue" />
          <AnimatePresence>
            {expandedSection === 'flights' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">{t('selection_studio_airline')}</th>
                        <th className="pb-2">{t('selection_studio_schedule')}</th>
                        <th className="pb-2">{t('selection_studio_price')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchData.flights?.length ? [...searchData.flights].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)) : []).map((f: any, i: number) => {
                        const tp = mixPicks.transport as { name?: string; type?: string; label?: string; departure?: string; arrival?: string; price?: string } | undefined;
                        const isFlightPick = tp?.type === 'Flight' || tp?.label === 'Flight';
                        // Use composite key — multiple rows can share the same airline name
                        const rowKey = `${f.departure}|${f.arrival}|${f.price}`;
                        const pickedKey = `${tp?.departure}|${tp?.arrival}|${tp?.price}`;
                        const isSelected = isFlightPick && rowKey === pickedKey && rowKey !== '||';
                        return (
                          <tr key={i} onClick={() => {
                            const pick = { ...f, type: 'Flight' };
                            setMixPicks({ ...mixPicks, transport: pick });
                            patchTourGuide({ mix_picks: { ...mixPicks, transport: pick } });
                          }}
                          className={`group cursor-pointer transition-all ${isSelected ? 'bg-saffron/10' : 'hover:bg-orange-50/30'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-orange-100 group-hover:border-saffron/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-saffron' : 'text-[#000080]'}`}>{f.name || f.airline}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{f.departure} → {f.arrival}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[11px] font-black text-saffron">{f.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-orange-100 group-hover:border-saffron/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-saffron ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-orange-100 ml-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">{t('selection_studio_train')}</th>
                        <th className="pb-2">{t('selection_studio_class')}</th>
                        <th className="pb-2">{t('selection_studio_price')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchData.trains?.length ? [...searchData.trains].sort((a,b) => (parseInt(a.price?.replace(/[₹,]/g,'')) || 0) - (parseInt(b.price?.replace(/[₹,]/g,'')) || 0)) : []).map((t: any, i: number) => {
                        const tp = mixPicks.transport as { name?: string; type?: string; label?: string; departure?: string; arrival?: string; price?: string; class?: string } | undefined;
                        const isTrainPick = tp?.type === 'Train' || tp?.label === 'Train';
                        // Composite key using departure + class + price
                        const rowKey = `${t.name || t.train_name}|${t.class}|${t.price}`;
                        const pickedKey = `${tp?.name}|${tp?.class}|${tp?.price}`;
                        const isSelected = isTrainPick && rowKey === pickedKey && rowKey !== '||';
                        return (
                          <tr key={i} onClick={() => {
                            const pick = { ...t, type: 'Train' };
                            setMixPicks({ ...mixPicks, transport: pick });
                            patchTourGuide({ mix_picks: { ...mixPicks, transport: pick } });
                          }}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-saffron/10' : 'hover:bg-orange-50/30'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-orange-100 group-hover:border-saffron/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-saffron' : 'text-[#000080]'}`}>{t.name || t.train_name}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{t.class}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[11px] font-black text-saffron">{t.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-orange-100 group-hover:border-saffron/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-saffron ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-orange-100 ml-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Buses */}
        {searchData.buses?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader id="buses" icon={Bus} title={t('selection_studio_bus_options')} count={searchData.buses.length} variant="orange" />
          <AnimatePresence>
            {expandedSection === 'buses' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">{t('selection_studio_bus')}</th>
                        <th className="pb-2">{t('selection_studio_route')}</th>
                        <th className="pb-2">{t('selection_studio_price')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchData.buses?.length ? [...searchData.buses].sort((a,b) => (a.priceNum || 0) - (b.priceNum || 0)) : []).map((b: any, i: number) => {
                        const tp = mixPicks.transport as any;
                        const isBusPick = tp?.type === 'Bus' || tp?.label === 'Bus';
                        const rowKey = `${b.operator}|${b.departure}|${b.price}`;
                        const pickedKey = `${tp?.name}|${tp?.departure}|${tp?.price}`;
                        const isSelected = isBusPick && rowKey === pickedKey;
                        return (
                          <tr key={i} onClick={() => {
                            const pick = { ...b, type: 'Bus', label: 'Bus', name: b.operator };
                            setMixPicks({ ...mixPicks, transport: pick });
                            patchTourGuide({ mix_picks: { ...mixPicks, transport: pick } });
                          }}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-saffron/10' : 'hover:bg-orange-50/30'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-orange-100 group-hover:border-saffron/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-saffron' : 'text-[#000080]'}`}>{b.operator}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{b.type} · {b.departure} → {b.arrival}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[11px] font-black text-saffron">{b.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-orange-100 group-hover:border-saffron/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-saffron ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-orange-100 ml-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Ferries / Ro-Ro */}
        {searchData.ferries?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader id="ferries" icon={Ship} title={t('selection_studio_ferry_options')} count={searchData.ferries.length} variant="green" />
          <AnimatePresence>
            {expandedSection === 'ferries' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">{t('selection_studio_crossing')}</th>
                        <th className="pb-2">{t('selection_studio_route')}</th>
                        <th className="pb-2">{t('selection_studio_price')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchData.ferries?.length ? [...searchData.ferries] : []).map((ferry: any, i: number) => {
                        const tp = mixPicks.transport as { name?: string; type?: string; label?: string; departure?: string; arrival?: string; price?: string } | undefined;
                        const isFerryPick = tp?.type === 'Ferry' || tp?.label === 'Ferry';
                        const rowKey = `${ferry.name}|${ferry.departure}|${ferry.price}`;
                        const pickedKey = `${tp?.name}|${tp?.departure}|${tp?.price}`;
                        const isSelected = isFerryPick && rowKey === pickedKey && rowKey !== '||';
                        const routeBits = [ferry.departure, ferry.arrival].filter(Boolean).join(' → ');
                        const scheduleBits = [routeBits, ferry.duration].filter(Boolean).join(' · ');
                        return (
                          <tr key={i} onClick={() => {
                            const pick = { ...ferry, type: 'Ferry', label: 'Ferry' };
                            setMixPicks({ ...mixPicks, transport: pick });
                            patchTourGuide({ mix_picks: { ...mixPicks, transport: pick } });
                          }}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-orange-500/10' : 'hover:bg-orange-50/30'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-orange-100 group-hover:border-orange-500/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-orange-500' : 'text-[#000080]'}`}>{ferry.name}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-orange-500/30">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{scheduleBits || '—'}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-orange-500/30">
                              <span className="text-[11px] font-black text-saffron">{ferry.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-orange-100 group-hover:border-orange-500/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-orange-100 ml-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* 3. Hotels */}
        {searchData.hotels?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader id="hotels" icon={Hotel} title={t('selection_studio_stay_options')} count={searchData.hotels.length} variant="orange" />
          <AnimatePresence>
            {expandedSection === 'hotels' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">{t('selection_studio_hotel')}</th>
                        <th className="pb-2">{t('selection_studio_area')}</th>
                        <th className="pb-2">{t('selection_studio_rate')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchData.hotels?.length ? [...searchData.hotels].sort((a,b) => parseInt(a.price?.replace(/[₹,]/g,'')) - parseInt(b.price?.replace(/[₹,]/g,''))) : []).map((h: any, i: number) => {
                        const ph = mixPicks.hotel as { name?: string; location?: string; area?: string; price?: string } | undefined;
                        const rowKey = `${h.name}|${h.location || h.area}|${h.price}`;
                        const pickedKey = `${ph?.name}|${ph?.location || ph?.area}|${ph?.price}`;
                        const isSelected = rowKey === pickedKey && rowKey !== '||';
                        return (
                          <tr key={i} onClick={() => {
                            setMixPicks({ ...mixPicks, hotel: h });
                            patchTourGuide({ mix_picks: { ...mixPicks, hotel: h } });
                          }}
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-saffron/10' : 'hover:bg-orange-50/30'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-orange-100 group-hover:border-saffron/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-saffron' : 'text-[#000080]'}`}>{h.name}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{h.location || h.area}</span>
                            </td>
                            <td className="py-2.5 border-y border-orange-100 group-hover:border-saffron/30">
                              <span className="text-[11px] font-black text-saffron">{h.price}/N</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-orange-100 group-hover:border-saffron/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-saffron ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-orange-100 ml-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </AnimatePresence>
        </div>
        )}

      </div>

      <div className="flex flex-col gap-4 pt-10 border-t border-slate-200">
        <button
          onClick={onConfirm}
          className="w-full py-6 bg-gradient-to-r from-saffron to-orange-600 text-white rounded-[2rem] font-black text-base uppercase tracking-widest hover:shadow-2xl hover:shadow-saffron/30 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
        >
          {t('selection_studio_confirm_choices')} <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onBack}
          className="w-full py-4 text-[#138808] hover:text-green-800 font-black text-xs uppercase tracking-[0.2em] transition-all"
        >
          ← {t('selection_studio_adjust_itinerary')}
        </button>
      </div>
    </motion.div>
  );
}
