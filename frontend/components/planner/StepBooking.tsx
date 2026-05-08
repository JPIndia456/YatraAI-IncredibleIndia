'use client';

import { motion } from 'framer-motion';
import { Sparkles, Train, Plane, Zap, Send, Compass, User, Users, ShieldCheck, ChevronDown, Trash2, Plus, Check, ArrowRight, Download } from 'lucide-react';
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
  const { mixPicks, activeItinerary, setActiveItinerary } = useTripPlannerStore();
  const { telegramId, patchTourGuide } = useTourGuideStore();
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
      border: 'border-l-blue-500/60',
      icon: 'text-blue-400',
      title: 'text-blue-400',
      cta: 'bg-blue-700 text-[#003366]',
    },
    cyan: {
      border: 'border-l-blue-600/60',
      icon: 'text-blue-600',
      title: 'text-blue-600',
      cta: 'bg-blue-600 text-zinc-950',
    },
    emerald: {
      border: 'border-l-blue-600/60',
      icon: 'text-blue-600',
      title: 'text-blue-600',
      cta: 'bg-emerald-600 text-[#003366]',
    },
    indigo: {
      border: 'border-l-indigo-500/60',
      icon: 'text-indigo-400',
      title: 'text-indigo-400',
      cta: 'bg-indigo-600 text-[#003366]',
    },
  };

  // Transport Selection
  if (mixPicks.transport) {
    const isFlight = mixPicks.transport.type === 'Flight';
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
      <div className="text-center space-y-1.5 pt-1">
        <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mx-auto border border-blue-600/20">
          <Sparkles className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-black text-[#003366] uppercase italic tracking-tighter">{t('booking_title')}</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('booking_subtitle')}</p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Zap className="w-2 h-2 text-indigo-400" />
            <span className="text-[9px] text-indigo-400 font-black uppercase">{t('booking_ai_prefill')}</span>
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
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      onBookAndPay(item);
                    }}
                    className={`px-4 py-2 ${colorUi[item.color]?.cta || colorUi.blue.cta} rounded-lg text-[10px] font-black uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-md`}
                  >
                    {t('booking_confirm')}
                  </button>
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
              <div key={idx} className={`grid grid-cols-12 gap-4 items-center bg-white/[0.02] border border-slate-200 rounded-2xl p-3 transition-all ${p.name.length > 2 ? 'border-blue-600/20' : 'hover:border-slate-200'}`}>
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
                      className="w-full bg-transparent border-none text-[11px] text-[#003366] placeholder:text-zinc-700 focus:ring-0 font-bold uppercase italic"
                    />
                    {p.name.length > 2 && <Check className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-blue-600" />}
                  </div>
                </div>
                <div className="col-span-2">
                  <select 
                    value={p.gender}
                    onChange={(e) => updatePassenger(idx, { gender: e.target.value })}
                    className="bg-transparent border-none text-[9px] text-zinc-500 focus:ring-0 cursor-pointer uppercase font-black"
                  >
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
                      p.age && (p.type === 'adult' ? parseInt(p.age) < 12 : parseInt(p.age) >= 12) 
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
                   {p.name.length > 2 ? (
                     <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-600/20 rounded">
                       <span className="text-[7px] font-black text-blue-600 uppercase tracking-tighter">{t('booking_ready')}</span>
                     </div>
                   ) : (
                     <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tighter">{t('booking_pending')}</span>
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
        className="bg-sky-600/5 border border-sky-500/10 rounded-2xl p-6 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Send className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">{t('booking_ready_for_booking')}</p>
              <h3 className="text-sm font-bold text-[#003366] tracking-tight">{t('booking_connect_telegram')}</h3>
            </div>
          </div>
          <div className="px-2 py-1 bg-sky-500/20 rounded-lg border border-sky-500/20">
            <span className="text-[8px] font-black text-sky-400 uppercase">{t('booking_recommended')}</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed italic">
          {t('booking_telegram_desc')}
        </p>

        {typeof process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME === 'string' &&
          process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME.trim().length > 0 && (
            <p className="text-[10px] text-slate-500 leading-snug">
              Bot configured in{' '}
              <span className="font-mono text-zinc-400">.env.local</span>: open{' '}
              <span className="text-sky-400 font-mono font-semibold">
                @{process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME.trim().replace(/^@/, '')}
              </span>{' '}
              in Telegram, tap <strong className="text-slate-600">Start</strong> and then tap <strong className="text-sky-600">📲 Share Contact</strong> to securely link your number.
            </p>
          )}

        <div className="flex gap-2">
          <div className="relative flex-1">
             <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-sky-600">+91</span>
             <input 
               type="tel" 
               placeholder={t('booking_mobile_placeholder')}
               value={telegramIdInput}
               onChange={(e) => {
                 const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                 setTelegramIdInput(val);
               }}
               disabled={!!telegramId}
               className={`w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs text-[#003366] placeholder:text-zinc-600 focus:border-sky-500/50 outline-none transition-all font-mono ${telegramId ? 'opacity-50' : ''}`}
             />
          </div>
          <button 
            type="button"
            disabled={linkingTelegram}
            onClick={async () => {
              if (telegramId) {
                patchTourGuide({ telegramId: '' });
                setInputs((p) => ({ ...p, telegramId: '' }));
                setTelegramIdInput('');
                if (user?.id) {
                  await supabase
                    .from('yatra_profiles')
                    .update({
                      telegram_id: null,
                      telegram_enabled: false,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id)
                    .then(({ error }) => {
                      if (error) console.warn('[telegram] profile clear', error);
                    });
                }
                toast.message('Telegram disconnected');
                return;
              }
              let raw = telegramIdInput.trim();
              if (/^\d{10}$/.test(raw)) {
                raw = '+91' + raw;
              }
              const normalized = normalizeTelegramContact(raw);
              if (normalized.length < 8) {
                toast.error(t('booking_invalid_number'), { description: t('booking_invalid_number_desc') });
                return;
              }
              setLinkingTelegram(true);
              try {
                patchTourGuide({ telegramId: normalized });
                setInputs((p) => ({ ...p, telegramId: normalized }));
                setTelegramIdInput(normalized.startsWith('91') ? normalized.slice(2) : normalized);

                if (user?.id) {
                  const now = new Date().toISOString();
                  const meta = user.user_metadata as Record<string, unknown> | undefined;
                  const fullName =
                    typeof meta?.full_name === 'string'
                      ? meta.full_name
                      : typeof meta?.name === 'string'
                        ? meta.name
                        : null;
                  let syncOk = false;
                  try {
                    const res = await fetch('/api/profile/telegram', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ telegram_id: normalized }),
                    });
                    const payload = await res.json().catch(() => ({}));
                    if (res.ok && payload.ok) {
                      syncOk = true;
                    } else {
                      console.warn('[telegram] server profile sync', payload?.error || res.status);
                    }
                  } catch (e) {
                    console.warn('[telegram] server profile sync fetch failed', e);
                  }

                  if (syncOk) {
                    toast.success('Telegram connected', {
                      description: 'You’ll receive booking alerts at this handle when messages are enabled.',
                    });
                  } else {
                    toast.success('Saved for this session', {
                      description: 'Telegram link updated. Cloud sync will finish in the background.',
                    });
                  }
                } else {
                  toast.success('Saved for this session', {
                    description: 'Sign in to sync Telegram to your profile and enable secure outbound messages.',
                  });
                }
              } finally {
                setLinkingTelegram(false);
              }
            }}
            className={`px-6 py-3 ${telegramId ? 'bg-zinc-800 text-zinc-400' : 'bg-sky-600 text-[#003366]'} rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 shrink-0 disabled:opacity-60`}
          >
            {linkingTelegram ? '…' : telegramId ? t('booking_disconnect') : t('booking_connect')}
          </button>
        </div>
        
        <p className="text-[9px] text-zinc-600 text-center font-medium">
          {t('booking_security_note')}
        </p>

        {telegramId && (
          <button 
            type="button"
            onClick={async () => {
              try {
                const res = await fetch('/api/telegram/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'welcome',
                    to: telegramId,
                    payload: { name: user?.user_metadata?.full_name || 'Traveler' }
                  })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                  toast.success('Test message sent!', { description: 'Check your Telegram app.' });
                } else {
                  toast.error('Send failed', { description: result.error || 'Please start the bot first.' });
                }
              } catch (e) {
                toast.error('Connection error');
              }
            }}
            className="w-full py-2 bg-sky-600/10 border border-sky-500/20 rounded-xl text-[9px] font-black text-sky-600 uppercase tracking-widest mt-2 hover:bg-sky-600/20 transition-all"
          >
            {t('booking_test_message')}
          </button>
        )}
      </motion.div>

      <div className="pt-10 border-t border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col gap-4 py-6">
          <div className="glass-panel p-6 border-saffron/20 bg-saffron/5 rounded-3xl flex items-center justify-between mb-2">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-saffron uppercase tracking-widest leading-none">{t('booking_grand_total')}</p>
                <h3 className="text-3xl font-black text-[#003366] italic tracking-tighter">₹{grandTotal.toLocaleString()}</h3>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase">{totalCount} {t('booking_travelers_registered')} · {nights} {t('booking_nights')}</p>
                {tripType === 'round' && <p className="text-[8px] font-black text-saffron uppercase">{t('booking_return_included')}</p>}
                <p className="text-[8px] font-bold text-green-600 uppercase">{t('booking_taxes_included')}</p>
             </div>
          </div>

          <button
            type="button"
            onClick={() => onBookAndPay(null)}
            className="w-full py-5 bg-[#FF671F] text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-saffron/20 flex items-center justify-center gap-3 active:scale-95"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            {t('booking_confirm_finalize')} - ₹{grandTotal.toLocaleString()}
          </button>

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
          className="w-full py-5 mt-4 bg-[#046A38] rounded-[2rem] text-white font-black text-xs uppercase shadow-xl shadow-green/20 transition-all active:scale-[0.98] hover:bg-green-800"
        >
          ← {t('back_to_marketplace')}
        </button>
      </div>
    </motion.div>
  );
}
