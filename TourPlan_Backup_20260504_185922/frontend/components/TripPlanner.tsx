'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train, Plane, Bus, Hotel, Car, CheckCircle2, Sparkles,
  ArrowRight, X, Download, Share2, BadgeIndianRupee,
  AlertTriangle, Calendar, ShieldCheck, Utensils, ChevronDown,
  MapPin, RotateCcw, Ship, Star
} from 'lucide-react';
import { useTripPlannerStore, useTripStore, useAIBrainStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { mergeApiHotelsWithCuratedSeeds } from '@/lib/hotelDestinationBoost';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWaterCrossingSuggestions } from '@/lib/waterTransportSuggestions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TierItem {
  label: string;
  name: string;
  detail: string;
  price: string;
  priceNum: number;
  icon: any;
  raw?: any;
  type?: string;
}

interface TripPlannerProps {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  suggestion?: any;
  onComplete?: () => void;
  onBack?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceNum(p?: string): number {
  if (!p) return 0;
  return parseInt(p.replace(/[₹,]/g, '')) || 0;
}

function indicativePriceNum(p?: string): number {
  if (!p) return 0;
  const m = String(p).match(/₹?\s*([\d,]+)/);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ''), 10) || 0;
}

function computeGrandTotal(transport: any, hotel: any, local: any, partySize: number, nights: number) {
  const pax = Math.max(1, partySize || 1);
  const nts = Math.max(1, nights || 1);
  const tp = Number(transport?.priceNum) || 0;
  const hp = Number(hotel?.priceNum) || 0;
  const lp = Number(local?.priceNum) || 0;
  return (tp * pax) + (hp * nts) + lp;
}

export default function TripPlanner({ origin, destination, startDate, endDate, suggestion, onComplete, onBack }: TripPlannerProps) {
  const router = useRouter();
  const { 
    setActiveItinerary, setSearchData, 
    activeStep, setActiveStep, selectedPlan, setSelectedPlan, mixPicks, setMixPicks,
    hotelTier, setHotelTier
  } = useTripPlannerStore();
  const { setOpen: setAIBrainOpen, setPendingOutbound } = useAIBrainStore();
  const { t } = useLanguage();
  const { adults, kids } = useTripStore();
  const partySize = Math.max(1, (Number(adults) || 1) + (Number(kids) || 0));

  const [loading, setLoading] = useState(false);
  const [allTransport, setAllTransport] = useState<TierItem[]>([]);
  const [allHotels, setAllHotels] = useState<TierItem[]>([]);
  const [allLocals, setAllLocals] = useState<TierItem[]>([]);
  const [selectionTab, setSelectionTab] = useState<'air' | 'rail' | 'stay' | 'mobility' | 'mix'>('air');
  const isFetchingRef = useRef(false);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 2;
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    return Math.max(1, Math.round(diff) || 2);
  }, [startDate, endDate]);

  const mixTotal = computeGrandTotal(mixPicks.transport, mixPicks.hotel, mixPicks.local, partySize, nights);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!destination || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    const date = startDate || new Date().toISOString().split('T')[0];
    try {
      const [trainsRes, flightsRes, busesRes, hotelsRes, taxisRes] = await Promise.allSettled([
        fetch('/api/live/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: origin, to: destination, date }) }),
        fetch('/api/live/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: origin, to: destination, date }) }),
        fetch('/api/live/buses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: origin, to: destination, date }) }),
        fetch('/api/live/hotels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: destination, checkIn: date, checkOut: endDate }) }),
        fetch('/api/live/taxis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: destination }) }),
      ]);

      const safe = async (r: PromiseSettledResult<Response>) => {
        if (r.status !== 'fulfilled') return {};
        try { return await r.value.json(); } catch { return {}; }
      };

      const [trains, flights, buses, hotels, taxis] = await Promise.all([safe(trainsRes), safe(flightsRes), safe(busesRes), safe(hotelsRes), safe(taxisRes)]);
      const h = mergeApiHotelsWithCuratedSeeds(hotels.hotels || [], destination);
      const ferriesData = trains.water_transport || getWaterCrossingSuggestions(origin, destination);

      const buildTransportList = (): TierItem[] => {
        const list: TierItem[] = [];
        (ferriesData || []).forEach((r: any) => list.push({ label: 'Ferry', name: r.name, detail: `${r.departure} → ${r.arrival}`, price: r.price, priceNum: indicativePriceNum(r.price), icon: Ship, raw: r }));
        (trains.trains || []).forEach((r: any) => list.push({ label: 'Train', name: r.name, detail: `${r.departure} → ${r.arrival}`, price: r.price, priceNum: priceNum(r.price), icon: Train, raw: r }));
        (flights.flights || []).forEach((r: any) => list.push({ label: 'Flight', name: r.airline, detail: `${r.departure} → ${r.arrival}`, price: r.price, priceNum: priceNum(r.price), icon: Plane, raw: r }));
        return list.sort((a, b) => a.priceNum - b.priceNum);
      };

      setAllTransport(buildTransportList());
      setAllHotels(h.map((r: any) => ({ label: 'Hotel', name: r.name, detail: `${r.area || ''} · ${r.stars}★`, price: r.price, priceNum: priceNum(r.price), icon: Hotel, raw: r })));
      setAllLocals((taxis.taxis || []).map((r: any) => ({ label: 'Taxi', name: r.type, detail: r.eta, price: r.price, priceNum: priceNum(r.price), icon: Car, raw: r })));
    } catch (e) { console.error(e); }
    setLoading(false);
    isFetchingRef.current = false;
  }, [origin, destination, startDate, endDate]);

  useEffect(() => { 
    fetchAll(); 
    setMixPicks({ transport: null, hotel: null, local: null });
    setActiveStep('tiers');
  }, [destination, fetchAll, setActiveStep, setMixPicks]);


  const handleConfirmPlan = () => {
    const { transport, hotel, local } = mixPicks;
    if (!transport || !hotel || !local) return;
    const totalNum = computeGrandTotal(transport, hotel, local, partySize, nights);
    const it = {
      ...selectedPlan,
      tierLabel: selectedPlan?.label || 'Custom', from: origin, to: destination, startDate, endDate, nights, transport, hotel, local, totalNum, total: `₹${totalNum.toLocaleString()}`,
      dayPlan: suggestion?.dayPlan, safety: suggestion?.safety, foodSpotsList: suggestion?.foodSpotsList
    };
    setActiveItinerary(it as any);
    if (onComplete) onComplete();
  };

  // ── Handlers ────────────────────────────────────────────────────────
  const handleTierSelect = (tier: any) => {
    setSelectedPlan(tier);
    setHotelTier(tier.id || 'recommended');
    setActiveStep('selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (activeStep === 'selection') {
      setActiveStep('tiers');
    } else if (onBack) {
      onBack();
    }
  };

  const displayDestination = destination || suggestion?.destination || 'Your Destination';

  if (!displayDestination || displayDestination.length < 2) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 font-black uppercase tracking-widest">Loading Odyssey Studio...</p>
      </div>
    );
  }

  // Default tiers if missing
  const activeTiers = suggestion?.tiers || [
    { id: 'recommended', label: 'Recommended', total: suggestion?.budget_cost_estimate || '₹25,000', sub: 'Best Value' },
    { id: 'economy', label: 'Economy', total: suggestion?.budget_train_estimate || '₹12,000', sub: 'Budget Friendly' },
    { id: 'premium', label: 'Premium', total: '₹45,000+', sub: 'Luxury Experience' }
  ];

  const filteredHotels = useMemo(() => {
    if (!hotelTier) return allHotels.slice(0, 5);
    return allHotels.filter(h => {
      const s = Number(h.raw?.stars) || 3;
      if (hotelTier === 'premium') return s >= 5;
      if (hotelTier === 'economy') return s <= 2;
      return s >= 3 && s <= 4;
    }).slice(0, 5);
  }, [allHotels, hotelTier]);

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative space-y-8 sm:space-y-12 max-w-6xl mx-auto pb-16">
      {/* Global Back Button for Selection Studio */}
      <button 
        onClick={handleBack}
        className="fixed bottom-8 left-8 z-50 flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl text-[#003366] font-black text-[10px] uppercase shadow-xl hover:bg-white transition-all active:scale-95"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Back
      </button>

      {activeStep === 'tiers' && (
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-[#003366] uppercase italic">TOUR<span className="text-cyan-400">PLAN</span> STUDIO</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select your baseline intelligence tier for {displayDestination}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-0">
            {activeTiers.map((tier: any) => (
              <button key={tier.id || tier.label} onClick={() => handleTierSelect(tier)} className="shell-panel p-6 text-left space-y-4 border border-slate-200 hover:border-cyan-500/50 group transition-all hover:translate-y-[-2px]">
                <div className="flex justify-between items-start">
                   <h4 className="text-xl font-black text-[#003366] uppercase italic leading-none">{tier.label}</h4>
                   <Sparkles className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xl font-black text-cyan-500 italic">{tier.total}</p>
                <div className="w-full py-3 bg-[#003366] text-white text-center rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-cyan-500 transition-colors">Configure →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeStep === 'selection' && (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b pb-6">
            <div className="space-y-2">
                <button onClick={() => { setActiveStep('tiers'); setMixPicks({ hotel: null }); }} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500 via-white to-green-600 rounded-lg text-zinc-950 font-black text-[7px] uppercase shadow-md transition-all active:scale-95">
                  <RotateCcw className="w-2 h-2" /> Back to Tiers
                </button>
               <h2 className="text-3xl font-black text-[#003366] uppercase italic tracking-tighter">{t('selection_studio')}</h2>
            </div>
            <div className="text-right p-5 bg-cyan-500/10 border border-cyan-500/20 rounded-3xl">
               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Indicative Total</p>
               <p className="text-2xl font-black text-[#003366] italic tracking-tighter">₹{mixTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-8 space-y-8">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl sticky top-4 z-10 shadow-sm">
                {[
                  { id: 'air', label: 'Air', icon: Plane, activeColor: 'text-blue-500' },
                  { id: 'rail', label: 'Rail', icon: Train, activeColor: 'text-amber-800' },
                  { id: 'mix', label: 'Mix', icon: Sparkles, activeColor: 'text-orange-500' },
                  { id: 'stay', label: 'Stay', icon: Hotel, activeColor: 'text-[#003366]' },
                  { id: 'mobility', label: 'Mobility', icon: Car, activeColor: 'text-[#003366]' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setSelectionTab(tab.id as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${selectionTab === tab.id ? `bg-white shadow-xl ${tab.activeColor}` : 'text-slate-500 hover:text-slate-700'}`}>
                    <tab.icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {selectionTab === 'stay' ? (
                  <motion.div key="stay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'recommended', label: 'Recommended', sub: '3–4 Stars', color: 'bg-blue-500' },
                        { id: 'economy', label: 'Economy', sub: '1–2 Stars', color: 'bg-emerald-500' },
                        { id: 'premium', label: 'Premium', sub: 'Luxury 5★', color: 'bg-purple-500' }
                      ].map(tier => (
                        <button key={tier.id} onClick={() => { setHotelTier(tier.id as any); setAIBrainOpen(true); setPendingOutbound({ text: `Show ${tier.label} hotels in ${destination}`, destinationBriefFormat: true }); }} className={`group p-6 rounded-3xl border text-left transition-all ${hotelTier === tier.id ? 'bg-[#003366] border-[#003366] shadow-2xl scale-[1.02]' : 'bg-white border-slate-200 hover:border-[#003366]/30'}`}>
                          <div className={`w-2 h-2 rounded-full mb-3 ${tier.color}`} />
                          <p className={`text-[9px] font-black uppercase mb-1 ${hotelTier === tier.id ? 'text-cyan-400' : 'text-slate-500'}`}>{tier.sub}</p>
                          <p className={`text-sm font-black uppercase italic ${hotelTier === tier.id ? 'text-white' : 'text-[#003366]'}`}>{tier.label}</p>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {loading ? (
                        <div className="py-20 text-center space-y-4">
                           <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sourcing verified properties...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {filteredHotels.map((item, i) => (
                            <div key={i} onClick={() => setMixPicks({ hotel: item })} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${mixPicks.hotel?.name === item.name ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'}`}>
                              <div className="flex justify-between items-center">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-black text-[#003366] text-sm uppercase italic tracking-tighter">{item.name}</h5>
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: Math.min(5, Number(item.raw?.stars || 3)) }).map((_, j) => (
                                        <Star key={j} className="w-2.5 h-2.5 fill-cyan-400 text-cyan-400" />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                     <span className="text-[9px] font-black text-slate-400 uppercase">{item.detail}</span>
                                     {(item.raw?.amenities || ['Free Wi-Fi', 'Breakfast']).slice(0, 2).map((a: string, j: number) => (
                                       <span key={j} className="text-[8px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{a}</span>
                                     ))}
                                  </div>
                                  {item.raw?.id && <p className="text-[7px] font-bold text-slate-300 uppercase">Ref: {item.raw.id}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-black text-[#003366] italic tracking-tighter">{item.price}</p>
                                  <p className="text-[8px] font-black text-slate-400 uppercase">Per night before taxes</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {filteredHotels.length === 0 && (
                            <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                              <Hotel className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No properties match this tier</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="others" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    {(selectionTab === 'air' || selectionTab === 'rail' || selectionTab === 'mix') && (
                      <div className="grid grid-cols-1 gap-2">
                        {(selectionTab === 'air' ? allAirs : selectionTab === 'rail' ? allRails : allMixes).map((item, i) => (
                          <div key={i} onClick={() => setMixPicks({ transport: item })} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${mixPicks.transport?.name === item.name ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-black text-[#003366] text-[11px] uppercase italic">{item.name}</h5>
                                  <span className="text-[7px] px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase">{item.label}</span>
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{item.detail}</p>
                              </div>
                            </div>
                            <p className="text-sm font-black text-cyan-600 italic">{item.price}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectionTab === 'mobility' && (
                      <div className="grid grid-cols-1 gap-2">
                        {allLocals.map((item, i) => (
                          <div key={i} onClick={() => setMixPicks({ local: item })} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${mixPicks.local?.name === item.name ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <Car className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <h5 className="font-black text-[#003366] text-[11px] uppercase italic">{item.name}</h5>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">{item.detail}</p>
                              </div>
                            </div>
                            <p className="text-sm font-black text-cyan-600 italic">{item.price}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="md:col-span-4 space-y-4">
              <div className="shell-panel p-5 space-y-5 bg-slate-50 border-slate-200 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Odyssey Cart</h4>
                  <ShoppingCart className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <div className="space-y-4">
                  {[
                    { icon: MapPin, label: 'Route', val: `${origin} → ${destination}` },
                    { icon: transportIsRailTabLike(mixPicks.transport) ? Train : Plane, label: 'Transit', val: mixPicks.transport?.name },
                    { icon: Hotel, label: 'Stay', val: mixPicks.hotel?.name },
                    { icon: Car, label: 'Mobility', val: mixPicks.local?.name }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <item.icon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{item.label}</p>
                        <p className="text-[10px] font-black text-[#003366] uppercase leading-none truncate italic">{item.val || 'Pending...'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <button 
                    onClick={handleConfirmPlan} 
                    disabled={!mixPicks.transport || !mixPicks.hotel || !mixPicks.local} 
                    className="w-full py-4 bg-[#003366] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl disabled:opacity-50 disabled:grayscale hover:bg-[#002244] transition-all italic tracking-widest"
                  >
                    Add to Cart & Review →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function transportIsRailTabLike(item: any): boolean {
  const lab = String(item?.label || '').toLowerCase();
  const typ = String(item?.type || '').toLowerCase();
  return lab.includes('train') || typ === 'train' || lab.includes('ferry') || typ === 'ferry';
}
