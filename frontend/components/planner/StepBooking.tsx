'use client';

import { motion } from 'framer-motion';
import { Sparkles, Train, Plane, Zap, Send, Compass, User, Users, ShieldCheck, ChevronDown, Trash2, Plus, Check, ArrowRight, Download, CheckCircle2, AlertCircle, UserCircle, Bus } from 'lucide-react';
import { toast } from 'sonner';

import { useTripPlannerStore, useTourGuideStore, useAIBrainStore } from '@/lib/store';
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { normalizeTelegramContact } from '@/lib/normalizeTelegramContact';
import type { PlannerInputs } from '@/components/planner/StepInputs';

interface StepBookingProps {
  searchData: { flights: any[]; trains: any[]; hotels: any[]; buses: any[] };
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  nights: number;
  tripType?: 'round' | 'one-way' | 'single';
  onBack: () => void;
  onBookAndPay: (item: any) => void;
  isSaving?: boolean;
}

function parsePrice(p?: string): number {
  if (!p) return 0;
  return parseInt(String(p).replace(/[₹,]/g, '')) || 0;
}

export default function StepBooking({ searchData, setInputs, nights, tripType, onBack, onBookAndPay }: StepBookingProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { mixPicks, activeItinerary, setActiveItinerary, setIsProfileOpen } = useTripPlannerStore();
  const { telegramId, telegramEnabled, patchTourGuide } = useTourGuideStore();
  const [telegramIdInput, setTelegramIdInput] = useState(() => (telegramId || '').trim());
  const [linkingTelegram, setLinkingTelegram] = useState(false);

  useEffect(() => {
    setTelegramIdInput((telegramId || '').trim());
  }, [telegramId]);

  // Initialize passengers from activeItinerary or default count
  const adultCount = activeItinerary?.adults || 1;
  const kidCount = activeItinerary?.kids || 0;
  const totalCount = adultCount + kidCount;

  const [passengers, setPassengers] = useState<any[]>(
    activeItinerary?.passengers || 
    [
      ...Array(adultCount).fill(0).map(() => ({ type: 'adult', name: '', gender: 'M', age: '' })),
      ...Array(kidCount).fill(0).map(() => ({ type: 'kid', name: '', gender: 'M', age: '' }))
    ]
  );

  const updatePassenger = (index: number, patch: any) => {
    const next = [...passengers];
    next[index] = { ...next[index], ...patch };
    setPassengers(next);
    // Sync to store
    if (activeItinerary) {
      setActiveItinerary({ ...activeItinerary, passengers: next });
    }
  };
  
  const options: Array<{
    icon: any; title: string; name: string; price: string;
    detail: string; color: string; badge: string;
  }> = [];

  const colorUi: Record<string, { border: string; icon: string; title: string; cta: string }> = {
    blue: {
      border: 'border-l-[#FF9933]/60',
      icon: 'text-[#FF9933]',
      title: 'text-[#FF9933]',
      cta: 'bg-[#FF9933] text-white',
    },
    cyan: {
      border: 'border-l-[#000080]/60',
      icon: 'text-[#000080]',
      title: 'text-[#000080]',
      cta: 'bg-[#000080] text-white',
    },
    emerald: {
      border: 'border-l-[#138808]/60',
      icon: 'text-[#138808]',
      title: 'text-[#138808]',
      cta: 'bg-[#138808] text-white',
    },
    indigo: {
      border: 'border-l-indigo-500/60',
      icon: 'text-indigo-400',
      title: 'text-indigo-400',
      cta: 'bg-indigo-600 text-white',
    },
  };  // Transport Selection Logic
  const allTransport = activeItinerary?.transportList || [];
  const flight = allTransport.find((t: any) => t?.mode?.toLowerCase().includes('flight'));
  const rail = allTransport.find((t: any) => t?.mode?.toLowerCase().includes('train'));
  const bus = allTransport.find((t: any) => t?.mode?.toLowerCase().includes('bus'));

  const currentTransport = mixPicks.transport;
  const isFlight = String(currentTransport?.label || currentTransport?.type || '').toLowerCase().includes('flight');
  const isRail = String(currentTransport?.label || currentTransport?.type || '').toLowerCase().includes('train');
  const isBus = String(currentTransport?.label || currentTransport?.type || '').toLowerCase().includes('bus');

  const setTransportMode = (mode: 'flight' | 'train' | 'bus') => {
    const target = mode === 'flight' ? flight : mode === 'train' ? rail : bus;
    if (target) {
      useTripPlannerStore.getState().setMixPicks({
        ...mixPicks,
        transport: {
          id: `trans-${Math.random()}`,
          name: target.mode,
          type: target.mode,
          price: target.price,
          time: target.duration || 'Flexible',
          class: target.detail || 'Standard',
          isAI: true
        }
      });
    } else {
      toast.error(`No ${mode} option available for this route.`);
    }
  };

  if (mixPicks.transport) {
    options.push({
      icon: isFlight ? Plane : isRail ? Train : Bus,
      title: isFlight ? `${mixPicks.transport.name || 'Flight'} ${t('booking_booking_label')}` : isRail ? t('booking_railways_ticket') : 'Bus Ticket',
      name: mixPicks.transport.name || mixPicks.transport.train_name || t('booking_transport_ticket'),
      price: mixPicks.transport.price || '₹0',
      detail: isFlight 
        ? `${mixPicks.transport.departure || '08:00'} → ${mixPicks.transport.arrival || '10:30'} · ${mixPicks.transport.duration || t('booking_non_stop')}`
        : `${mixPicks.transport.class || 'Standard'} · ${mixPicks.transport.departure || 'Flexible'} → ${mixPicks.transport.arrival || 'Scheduled'}`,
      color: isFlight ? 'blue' : isRail ? 'cyan' : 'emerald',
      badge: t('booking_selected'),
    });
  }

  // Return Transport — shown for round trips
  if (mixPicks.returnTransport) {
    const rt = mixPicks.returnTransport as any;
    const rtIsFlight = String(rt.type || rt.label || '').toLowerCase().includes('flight');
    const rtIsRail = String(rt.type || rt.label || '').toLowerCase().includes('train');
    options.push({
      icon: rtIsFlight ? Plane : rtIsRail ? Train : Bus,
      title: rtIsFlight ? `Return Flight ${t('booking_booking_label')}` : rtIsRail ? `Return ${t('booking_railways_ticket')}` : 'Return Bus',
      name: rt.airline || rt.name || rt.train_name || 'Return Journey',
      price: rt.price || '₹0',
      detail: rtIsFlight
        ? `${rt.departure || '—'} → ${rt.arrival || '—'} · ${rt.duration || 'Return'}`
        : `${rt.class || 'Standard'} · Return Leg`,
      color: rtIsFlight ? 'indigo' : rtIsRail ? 'cyan' : 'emerald',
      badge: 'Return',
    });
  }

  // Hotel Selection
  if (mixPicks.hotel) {
    options.push({
      icon: Sparkles,
      title: t('booking_stay_reservation'),
      name: mixPicks.hotel.name,
      price: mixPicks.hotel.price || '₹0',
      detail: `${mixPicks.hotel.rating}⭐ · ${mixPicks.hotel.location || mixPicks.hotel.area}`,
      color: isFlight ? 'emerald' : 'blue', // Varied colors
      badge: t('booking_selected'),
    });
  }


  // Calculate Totals
  const tp = parsePrice(mixPicks.transport?.price);
  const rp = parsePrice(mixPicks.returnTransport?.price);
  const hp = parsePrice(mixPicks.hotel?.price);
  const transportTotal = (tp + rp) * totalCount;
  const grandTotal = transportTotal + (hp * nights);

  return (
    <motion.div
      key="step-booking"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >


      <div className="text-center space-y-2 py-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-r from-[#FF9933]/10 via-transparent to-[#138808]/10 blur-3xl pointer-events-none" />
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto border-2 border-slate-100 shadow-xl relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933]/5 to-[#138808]/5 rounded-3xl" />
          <Sparkles className="w-8 h-8 text-[#000080] relative z-20 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black text-[#000080] uppercase italic tracking-tighter relative z-10">
          <span className="text-[#FF9933]">ओडिसी</span> <span className="text-[#138808]">चेकआउट</span>
        </h2>
        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#FF9933] rounded-full animate-pulse" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('booking_subtitle')}</p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#138808]/10 border border-[#138808]/20 rounded-lg">
            <Zap className="w-2 h-2 text-[#138808]" />
            <span className="text-[9px] text-[#138808] font-black uppercase">{t('booking_ai_prefill')}</span>
          </span>
        </div>
      </div>



      {/* Passenger Manifest Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-6 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#003366] tracking-tight uppercase tracking-[0.1em]">{t('booking_passenger_details')}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{totalCount} {t('booking_travelers_registered')}</p>
              <p className="text-[9px] text-red-600 font-black uppercase tracking-tight mt-1 animate-pulse">{t('booking_id_warning')}</p>
            </div>
          </div>
          {totalCount === 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('booking_shield_active')}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">


          <div className="space-y-3">
            {passengers.map((p, idx) => (
              <div key={idx} className={`grid grid-cols-12 gap-4 items-center bg-white/[0.02] border border-slate-200 rounded-2xl p-3 transition-all ${p.name.length > 1 ? 'border-blue-600/20' : 'hover:border-slate-200'}`}>
                <div className="col-span-1 flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${p.type === 'adult' ? 'bg-slate-100 text-slate-500' : 'bg-blue-600/20 text-blue-600'}`}>
                    {idx + 1}
                  </div>
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder={p.type === 'adult' ? t('booking_adult_name') : t('booking_kid_name')}
                      value={p.name}
                      onChange={(e) => updatePassenger(idx, { name: e.target.value })}
                      className={`w-full bg-transparent border-none text-[11px] text-[#003366] placeholder:text-zinc-700 focus:ring-0 font-bold uppercase italic ${
                        !p.name.trim() ? 'border-b border-dashed border-amber-200' : ''
                      }`}
                    />
                    {p.name.length > 1 && <Check className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-blue-600" />}
                  </div>
                </div>
                <div className="col-span-2">
                  <select 
                    value={p.gender}
                    onChange={(e) => updatePassenger(idx, { gender: e.target.value })}
                    className={`bg-transparent border-none text-[9px] text-zinc-500 focus:ring-0 cursor-pointer uppercase font-black ${
                      !p.gender ? 'text-amber-500' : ''
                    }`}
                  >
                    <option value="">{t('booking_gender')}</option>
                    <option value="M">{t('booking_male')}</option>
                    <option value="F">{t('booking_female')}</option>
                    <option value="O">{t('booking_other')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input 
                    type="number" 
                    placeholder={t('booking_age_placeholder')}
                    min={0}
                    value={p.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') { updatePassenger(idx, { age: '' }); return; }
                      const num = parseInt(val);
                      if (num < 0) return;
                      updatePassenger(idx, { age: val });
                    }}
                    className={`w-full bg-transparent border-none text-[10px] placeholder:text-zinc-700 focus:ring-0 font-black italic ${
                      !p.age ? 'border-b border-dashed border-amber-200' : 
                      (p.type === 'adult' ? parseInt(p.age) < 12 : parseInt(p.age) >= 12) 
                        ? 'text-red-500 animate-pulse' 
                        : 'text-zinc-500'
                    }`}
                  />
                  {p.age && (p.type === 'adult' ? parseInt(p.age) < 12 : parseInt(p.age) >= 12) && (
                    <p className="text-[6px] text-red-500 font-bold uppercase absolute mt-6 bg-white px-1">
                      {p.type === 'adult' ? '> 12 Required' : '< 12 Required'}
                    </p>
                  )}
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2 pr-2">
                   {p.name.trim().length > 1 && Number(p.age) > 0 && p.gender ? (
                     <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1">
                       <CheckCircle2 className="w-2 h-2 text-emerald-500" />
                       <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">{t('booking_ready')}</span>
                     </div>
                   ) : (
                     <div className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1">
                       <AlertCircle className="w-2 h-2 text-amber-500" />
                       <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">{t('booking_pending')}</span>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalCount === 1 && (
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-[#003366] uppercase tracking-tight">{t('booking_yatra_shield_title')}</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              {t('booking_yatra_shield_desc')}
            </p>
          </div>
        )}
      </motion.div>


      {/* Explicit interaction: Clicking the grand total proceeds to payment. Removed explicit button. */}

      <div className="pt-10 border-t border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col gap-4 py-6">
          <motion.div 
            whileHover={!isSaving ? { scale: 1.02 } : {}}
            whileTap={!isSaving ? { scale: 0.98 } : {}}
            onClick={() => !isSaving && onBookAndPay(passengers)}
            className={`glass-panel p-6 border-saffron/20 bg-saffron/5 rounded-3xl flex items-center justify-between mb-2 transition-all
              ${isSaving ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer group'}`}
          >
             <div className="space-y-1">
                <p className="text-[10px] font-black text-saffron uppercase tracking-widest leading-none">
                  {isSaving ? 'Finalizing...' : t('booking_grand_total')}
                </p>
                <h3 className="text-3xl font-black text-[#003366] italic tracking-tighter">₹{grandTotal.toLocaleString()}</h3>
             </div>
             <div className="text-right flex flex-col items-end">
                <p className="text-[9px] font-bold text-slate-400 uppercase">{totalCount} {t('booking_travelers_registered')} · {nights} {t('booking_nights')}</p>
                <div className="flex items-center gap-2 mt-2">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-[10px] font-black text-saffron uppercase tracking-widest">Click to Finalize</span>
                      <ArrowRight className="w-4 h-4 text-saffron animate-pulse" />
                    </>
                  )}
                </div>
             </div>
          </motion.div>

          {/* Implicit interaction: Clicking the grand total proceeds to payment. Removed explicit button. */}

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-emerald-50 flex items-center justify-center gap-2 active:scale-95 italic"
          >
            <Download className="w-4 h-4" />
            {t('booking_download_details')}
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full py-5 mt-4 bg-[#138808] rounded-[2rem] text-white font-black text-xs uppercase shadow-xl shadow-green/20 transition-all active:scale-[0.98] hover:bg-green-800"
        >
          ← {t('back_to_marketplace')}
        </button>
      </div>
    </motion.div>
  );
}
