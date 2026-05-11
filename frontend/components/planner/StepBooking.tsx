'use client';

import { motion } from 'framer-motion';
import { Sparkles, Train, Plane, Zap, Send, Compass, User, Users, ShieldCheck, ChevronDown, Trash2, Plus, Check, ArrowRight, Download, CheckCircle2, AlertCircle, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useTripPlannerStore, useTourGuideStore, useAIBrainStore } from '@/lib/store';
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { normalizeTelegramContact } from '@/lib/normalizeTelegramContact';
import type { PlannerInputs } from '@/components/planner/StepInputs';

interface StepBookingProps {
  searchData: { flights: any[]; trains: any[]; hotels: any[]; buses: any[]; taxis: any[] };
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  nights: number;
  tripType?: 'round' | 'one-way' | 'single';
  onBack: () => void;
  onBookAndPay: (item: any) => void;
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
  };

  // Transport Selection
  if (mixPicks.transport) {
    const isFlight = String(mixPicks.transport.label || mixPicks.transport.type || '').toLowerCase().includes('flight');
    options.push({
      icon: isFlight ? Plane : Train,
      title: isFlight ? `${mixPicks.transport.name || mixPicks.transport.airline} ${t('booking_booking_label')}` : t('booking_railways_ticket'),
      name: mixPicks.transport.name || mixPicks.transport.train_name || t('booking_transport_ticket'),
      price: mixPicks.transport.price || '₹0',
      detail: isFlight 
        ? `${mixPicks.transport.departure} → ${mixPicks.transport.arrival} · ${mixPicks.transport.duration || t('booking_non_stop')}`
        : `${mixPicks.transport.class} · ${mixPicks.transport.departure} → ${mixPicks.transport.arrival}`,
      color: isFlight ? 'blue' : 'cyan',
      badge: t('booking_selected'),
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
      color: 'emerald',
      badge: t('booking_selected'),
    });
  }

  // Local Selection
  if (mixPicks.local) {
     options.push({
      icon: Zap,
      title: t('booking_local_transport'),
      name: mixPicks.local.name,
      price: mixPicks.local.price || 'Included',
      detail: mixPicks.local.detail || 'Private service',
      color: 'indigo',
      badge: t('booking_selected'),
    });
  }

  // Calculate Totals
  const tp = parsePrice(mixPicks.transport?.price);
  const rp = parsePrice(mixPicks.returnTransport?.price);
  const hp = parsePrice(mixPicks.hotel?.price);
  const lp = parsePrice(mixPicks.local?.price);
  
  const transportTotal = (tp + rp) * totalCount;
  const grandTotal = transportTotal + (hp * nights) + lp;

  return (
    <motion.div
      key="step-booking"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
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

      {/* Option cards */}
      {options.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-panel p-4 border-l-4 ${colorUi[item.color]?.border || colorUi.blue.border} space-y-3 hover:bg-white/[0.03] transition-all rounded-xl`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${colorUi[item.color]?.icon || colorUi.blue.icon}`} />
                  <span className={`text-xs font-semibold ${colorUi[item.color]?.title || colorUi.blue.title}`}>{item.title}</span>
                </div>
                <span className="text-11 font-semibold px-2 py-0.5 bg-white/5 rounded-full border border-slate-200 text-[var(--text-muted)]">
                  {item.badge}
                </span>
              </div>

              <div>
                <h4 className="text-base font-black text-[#003366] uppercase italic leading-none">{item.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{item.detail}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{t('booking_estimated_price')}</p>
                  <p className="text-xl font-black text-[#003366] italic">{item.price}</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Check className="w-3 h-3 text-[#138808]" />
                    <span className="text-[8px] font-black text-[#138808] uppercase tracking-widest">{t('booking_selected')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-panel py-3 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center border border-slate-200 shrink-0">
              <Compass className="w-4 h-4 text-slate-400 animate-pulse" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-tight">
              <span className="text-saffron">{t('booking_sourcing_options')}</span> 
              <span className="text-slate-400 ml-2 font-bold italic truncate hidden sm:inline">{t('booking_checking_availability')}</span>
            </p>
          </div>
          <button 
            onClick={() => {
              useAIBrainStore.getState().addMessage({ role: 'user', content: 'Sync my booking options. I am ready to book now.' });
            }}
            className="px-4 py-2 bg-saffron/10 hover:bg-saffron/20 border border-saffron/20 rounded-lg text-[9px] font-black text-saffron uppercase tracking-widest transition-all shrink-0"
          >
            {t('booking_resync_ai')}
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-12 gap-3 px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">{t('booking_full_name')}</div>
            <div className="col-span-2">{t('booking_gender')}</div>
            <div className="col-span-2">{t('booking_age')}</div>
            <div className="col-span-3 text-right">{t('booking_actions')}</div>
          </div>

          <div className="space-y-3">
            {passengers.map((p, idx) => (
              <div key={idx} className={`grid grid-cols-12 gap-4 items-center bg-white/[0.02] border border-slate-200 rounded-2xl p-3 transition-all ${p.name.length > 1 ? 'border-blue-600/20' : 'hover:border-slate-200'}`}>
                <div className="col-span-1 flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${p.type === 'adult' ? 'bg-zinc-800 text-zinc-400' : 'bg-blue-600/20 text-blue-600'}`}>
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


      {/* Telegram Hookup */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden"
      >
        {/* Tricolour Accent Strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${telegramId ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center transition-colors`}>
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">{t('booking_telegram_title')}</h3>
              {telegramId ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${telegramEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${telegramEnabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {telegramEnabled ? 'Telegram Ready' : 'Linked (Step 1/2)'}
                  </span>
                </div>
              ) : (
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('booking_telegram_subtitle')}</p>
              )}
            </div>
          </div>
          {telegramId && (
             <button 
               type="button"
               onClick={() => setIsProfileOpen(true)}
               className="p-2 hover:bg-slate-50 rounded-lg transition-all"
             >
               <UserCircle className="w-4 h-4 text-slate-400 hover:text-sky-500" />
             </button>
          )}
        </div>

        <p className="text-[13px] text-zinc-600 leading-relaxed font-bold">
          {telegramId ? t('booking_telegram_desc') : 'Link your Telegram to receive live PNR updates, boarding alerts, and concierge support.'}
        </p>

        {!telegramId ? (
          <button 
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="w-full py-4 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <UserCircle className="w-3.5 h-3.5" /> Setup Telegram Identity
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-sky-500" />
                 <span className="text-xs font-mono font-black text-[#003366]">{telegramId.startsWith('+91') ? telegramId : `+91 ${telegramId}`}</span>
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Linked via Profile</span>
            </div>

            {/^\+?91\d{10}$/.test(telegramId.replace(/\s/g, '')) && (
               <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl space-y-3">
                  <p className="text-[11px] text-sky-700 font-bold leading-relaxed">
                    <span className="text-sky-900 font-black">Final Step:</span> To receive your PNR and live updates, you must share your contact in Telegram.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'Rujubot';
                      window.open(`https://t.me/${botName.replace(/^@/, '')}?start=link`, '_blank');
                    }}
                    className="w-full py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-200"
                  >
                    <Send className="w-3 h-3" /> Launch Yatra Bot & Share Contact
                  </button>
               </div>
            )}
          </div>
        )}
        
        <p className="text-[11px] text-zinc-700 text-center font-bold">
          {t('booking_security_note')}
        </p>

        {telegramId && (
          <button 
            type="button"
            onClick={async () => {
              try {
                // 1. Proactively refetch profile to check if they've shared contact with the bot
                let latestId = telegramId;
                if (user?.id) {
                  const { data: profile } = await supabase
                    .from('yatra_profiles')
                    .select('telegram_id, telegram_enabled')
                    .eq('user_id', user.id)
                    .maybeSingle();
                  
                  if (profile?.telegram_id) {
                    latestId = profile.telegram_id;
                    if (profile.telegram_id !== telegramId || profile.telegram_enabled !== telegramEnabled) {
                      patchTourGuide({ 
                        telegramId: profile.telegram_id, 
                        telegramEnabled: !!profile.telegram_enabled 
                      });
                      setInputs((p) => ({ ...p, telegramId: profile.telegram_id }));
                    }
                  }
                }

                const res = await fetch('/api/telegram/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'welcome',
                    to: latestId,
                    payload: { name: user?.user_metadata?.full_name || 'Traveler' }
                  })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                  toast.success('Test message sent!', { description: 'Check your Telegram app.' });
                } else {
                  toast.error('Send failed', { 
                    description: result.error || 'Please start the bot and share contact first.' 
                  });
                }
              } catch (e) {
                toast.error('Connection error');
              }
            }}
            className="w-full py-3 bg-white border-t-2 border-t-[#FF9933] border-b-2 border-b-[#138808] border-x border-x-slate-200 rounded-xl text-[11px] font-black text-[#003366] uppercase tracking-widest mt-2 hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Send className="w-3 h-3 text-[#FF9933]" />
            {t('booking_test_message')}
            <Sparkles className="w-3 h-3 text-[#138808]" />
          </button>
        )}
      </motion.div>

      <div className="pt-10 border-t border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col gap-4 py-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onBookAndPay(null)}
            className="glass-panel p-6 border-saffron/20 bg-saffron/5 rounded-3xl flex items-center justify-between mb-2 cursor-pointer group"
          >
             <div className="space-y-1">
                <p className="text-[10px] font-black text-saffron uppercase tracking-widest leading-none">{t('booking_grand_total')}</p>
                <h3 className="text-3xl font-black text-[#003366] italic tracking-tighter">₹{grandTotal.toLocaleString()}</h3>
             </div>
             <div className="text-right flex flex-col items-end">
                <p className="text-[9px] font-bold text-slate-400 uppercase">{totalCount} {t('booking_travelers_registered')} · {nights} {t('booking_nights')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black text-saffron uppercase tracking-widest">Click to Finalize</span>
                  <ArrowRight className="w-4 h-4 text-saffron animate-pulse" />
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
