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

  const SectionHeader = ({ id, icon: Icon, title, count }: any) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-zinc-900/40 border border-slate-200 rounded-xl hover:border-blue-600/30 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${expandedSection === id ? 'bg-blue-600/20' : 'bg-zinc-800'} transition-colors`}>
          <Icon className={`w-4 h-4 ${expandedSection === id ? 'text-blue-600' : 'text-slate-500'}`} />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-[#003366] uppercase tracking-tight italic">{title}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{count} options available</p>
        </div>
      </div>
      {expandedSection === id ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-blue-600" />}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto border border-blue-600/20 shadow-inner">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter italic">Select Best Options</h2>
        <p className="text-caption">Refine your itinerary components below</p>
      </div>

      {/* --- Budget Transparency & Adjustment --- */}
      <div className="shell-panel p-5 bg-blue-600/5 border-blue-600/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Budget Intelligence Report</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] text-slate-500 font-bold uppercase">Target:</span>
             <span className="text-xs font-black text-[#003366] italic">₹{targetBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic border-l-2 border-blue-600/30 pl-4 py-1">
          "I prioritized the <strong className="text-blue-600 uppercase">{activeItinerary.tierLabel}</strong> tier to ensure a balanced mix of comfort and value. My logic accounted for {adults} adults {kids > 0 ? `and ${kids} children` : ''}."
        </p>
        
        {/* Adjustment Controls */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adjust for a different experience?</p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Target Budget</label>
                 <div className="flex items-center justify-between bg-white/40 rounded-xl p-2 border border-slate-200">
                    <button onClick={() => useTripStore.getState().setTargetBudget(Math.max(10000, targetBudget - 5000))} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[#003366] hover:bg-white/5 transition-all">−</button>
                    <span className="text-xs font-black text-[#003366] italic">₹{targetBudget.toLocaleString()}</span>
                    <button onClick={() => useTripStore.getState().setTargetBudget(targetBudget + 5000)} className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 hover:bg-blue-600/20 transition-all">+</button>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Travel Party</label>
                 <div className="flex items-center justify-between bg-white/40 rounded-xl p-2 border border-slate-200">
                    <button onClick={() => useTripStore.getState().setTravelers(Math.max(1, adults - 1), kids)} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[#003366] hover:bg-white/5 transition-all">−</button>
                    <span className="text-xs font-black text-[#003366] italic">{adults} Adults</span>
                    <button onClick={() => useTripStore.getState().setTravelers(adults + 1, kids)} className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 hover:bg-blue-600/20 transition-all">+</button>
                 </div>
              </div>
           </div>
           <button onClick={() => onUpdateParams ? onUpdateParams() : onBack()} className="w-full py-2.5 bg-zinc-900/60 hover:bg-zinc-800 border border-slate-200 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest transition-all">
              Update Plan with New Parameters →
           </button>
        </div>
      </div>

      {/* --- Options List --- */}
      <div className="space-y-3">
        {/* 1. Flights */}
        {searchData.flights?.length > 0 && (
        <div className="space-y-2">
          <SectionHeader id="flights" icon={Plane} title="Air Options" count={searchData.flights.length} />
          <AnimatePresence>
            {expandedSection === 'flights' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">Airline</th>
                        <th className="pb-2">Schedule</th>
                        <th className="pb-2">Price</th>
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
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-slate-200 group-hover:border-blue-600/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-blue-600' : 'text-[#003366]'}`}>{f.name || f.airline}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{f.departure} → {f.arrival}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[11px] font-black text-blue-600 italic">{f.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-slate-200 group-hover:border-blue-600/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 ml-auto" />}
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
          <SectionHeader id="trains" icon={Train} title="Rail Options (IRCTC Live)" count={searchData.trains.length} />
          <AnimatePresence>
            {expandedSection === 'trains' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">Train</th>
                        <th className="pb-2">Class</th>
                        <th className="pb-2">Price</th>
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
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-slate-200 group-hover:border-blue-600/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-blue-600' : 'text-[#003366]'}`}>{t.name || t.train_name}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{t.class}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[11px] font-black text-blue-600 italic">{t.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-slate-200 group-hover:border-blue-600/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 ml-auto" />}
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
          <SectionHeader id="ferries" icon={Ship} title="Ferry / Ro‑Ro" count={searchData.ferries.length} />
          <AnimatePresence>
            {expandedSection === 'ferries' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">Crossing</th>
                        <th className="pb-2">Route</th>
                        <th className="pb-2">From</th>
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
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-teal-500/10' : 'hover:bg-white/5'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-slate-200 group-hover:border-teal-500/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-teal-400' : 'text-[#003366]'}`}>{ferry.name}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-teal-500/30">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{scheduleBits || '—'}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-teal-500/30">
                              <span className="text-[11px] font-black text-teal-400 italic">{ferry.price}</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-slate-200 group-hover:border-teal-500/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 ml-auto" />}
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
          <SectionHeader id="hotels" icon={Hotel} title="Stays (Lowest to Higher)" count={searchData.hotels.length} />
          <AnimatePresence>
            {expandedSection === 'hotels' && (
                <div className="overflow-x-auto custom-scrollbar pt-2">
                  <table className="w-full border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-left">
                        <th className="pb-2 pl-3">Hotel</th>
                        <th className="pb-2">Area</th>
                        <th className="pb-2">Rate</th>
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
                            className={`group cursor-pointer transition-all ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}
                          >
                            <td className="py-2.5 pl-3 rounded-l-xl border-y border-l border-slate-200 group-hover:border-blue-600/30">
                              <span className={`text-[11px] font-bold uppercase transition-colors ${isSelected ? 'text-blue-600' : 'text-[#003366]'}`}>{h.name}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">{h.location || h.area}</span>
                            </td>
                            <td className="py-2.5 border-y border-slate-200 group-hover:border-blue-600/30">
                              <span className="text-[11px] font-black text-blue-600 italic">{h.price}/N</span>
                            </td>
                            <td className="py-2.5 pr-3 rounded-r-xl border-y border-r border-slate-200 group-hover:border-blue-600/30 text-right">
                              {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 ml-auto" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 ml-auto" />}
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

        {/* 4. Taxis */}
        <div className="space-y-2">
          <SectionHeader id="taxis" icon={Car} title="Mobility (Private & Shared)" count={searchData.taxis?.length || 0} />
          <AnimatePresence>
            {expandedSection === 'taxis' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 pl-4 border-l border-blue-600/20 ml-6">
                {(searchData.taxis?.length ? searchData.taxis : [
                   { name: 'Private Sedan (24/7)', type: 'Private', detail: 'AC, Experienced Driver', price: '₹2,500/day' },
                   { name: 'Shared Outstation', type: 'Shared', detail: 'Standard AC', price: '₹1,200/seat' }
                ]).map((x: any, i: number) => {
                   const pl = mixPicks.local as { name?: string; type?: string; price?: string } | undefined;
                   const rowKey = `${x.name}|${x.type}|${x.price}`;
                   const pickedKey = `${pl?.name}|${pl?.type}|${pl?.price}`;
                   const isSelected = rowKey === pickedKey && rowKey !== '||';
                  return (
                    <button 
                      key={i} 
                      onClick={() => {
                        setMixPicks({ ...mixPicks, local: x });
                        patchTourGuide({ mix_picks: { ...mixPicks, local: x } });
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-blue-600/10 border-blue-600/30 ring-1 ring-blue-600/20' : 'bg-zinc-900/40 border-slate-200 hover:border-slate-200'} flex justify-between items-center group`}
                    >
                      <div className="space-y-1">
                        <p className={`text-xs font-bold uppercase transition-colors ${isSelected ? 'text-blue-600' : 'text-[#003366]'}`}>{x.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{x.type} · {x.detail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-blue-600">{x.price}</p>
                        {isSelected && <span className="text-[8px] font-black text-[#003366] bg-cyan-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Selected</span>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-10 border-t border-slate-200">
        <button
          onClick={onConfirm}
          className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-[#003366] rounded-[2rem] font-black text-sm uppercase tracking-widest hover:shadow-2xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
        >
          {t('confirm_all_choices')} <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onBack}
          className="w-full py-4 text-slate-500 hover:text-[#003366] font-bold text-[10px] uppercase tracking-[0.2em] transition-all"
        >
          ← {t('adjust_itinerary')}
        </button>
      </div>
    </motion.div>
  );
}
