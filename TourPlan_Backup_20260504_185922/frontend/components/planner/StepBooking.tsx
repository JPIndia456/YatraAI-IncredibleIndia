'use client';

import { motion } from 'framer-motion';
import { Sparkles, Train, Plane, Zap, Send, Compass, User, Users, ShieldCheck, ChevronDown, Trash2, Plus, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { useTripPlannerStore, useTourGuideStore } from '@/lib/store';
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { normalizeTelegramContact } from '@/lib/normalizeTelegramContact';
import type { PlannerInputs } from '@/components/planner/StepInputs';

interface StepBookingProps {
  searchData: { flights: any[]; trains: any[]; hotels: any[]; buses: any[]; taxis: any[] };
  setInputs: Dispatch<SetStateAction<PlannerInputs>>;
  onBack: () => void;
  onBookAndPay: (item: any) => void;
}

export default function StepBooking({ searchData, setInputs, onBack, onBookAndPay }: StepBookingProps) {
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
      title: isFlight ? `${mixPicks.transport.name || mixPicks.transport.airline} Booking` : 'Indian Railways Ticket',
      name: mixPicks.transport.name || mixPicks.transport.train_name || 'Transport Ticket',
      price: mixPicks.transport.price || '₹0',
      detail: isFlight 
        ? `${mixPicks.transport.departure} → ${mixPicks.transport.arrival} · ${mixPicks.transport.duration || 'Non-stop'}`
        : `${mixPicks.transport.class} · ${mixPicks.transport.departure} → ${mixPicks.transport.arrival}`,
      color: isFlight ? 'blue' : 'cyan',
      badge: 'Selected',
    });
  }

  // Hotel Selection
  if (mixPicks.hotel) {
    options.push({
      icon: Sparkles,
      title: 'Stay Reservation',
      name: mixPicks.hotel.name,
      price: mixPicks.hotel.price || '₹0',
      detail: `${mixPicks.hotel.rating}⭐ · ${mixPicks.hotel.location || mixPicks.hotel.area}`,
      color: 'emerald',
      badge: 'Selected',
    });
  }

  // Local Selection
  if (mixPicks.local) {
     options.push({
      icon: Zap,
      title: 'Local Transport',
      name: mixPicks.local.name,
      price: mixPicks.local.price || 'Included',
      detail: mixPicks.local.detail || 'Private service',
      color: 'indigo',
      badge: 'Selected',
    });
  }

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
        <h2 className="text-xl font-black text-[#003366] uppercase italic tracking-tighter">Odyssey Checkout</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live rates · Real-time sync</p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Zap className="w-2 h-2 text-indigo-400" />
            <span className="text-[9px] text-indigo-400 font-black uppercase">AI Pre-fill Active</span>
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
                  <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Estimated Price</p>
                  <p className="text-xl font-black text-[#003366] italic">{item.price}</p>
                </div>
                <div className="flex gap-1.5">
                  {item.title.toLowerCase().includes('flight') && (
                    <button
                      onClick={() => {
                        const AIRPORT_MAP: Record<string, string> = {
                          'Mumbai': 'BOM', 'Delhi': 'DEL', 'Bangalore': 'BLR', 'Chennai': 'MAA', 
                          'Kolkata': 'CCU', 'Hyderabad': 'HYD', 'Pune': 'PNQ', 'Ahmedabad': 'AMD',
                           'Jaipur': 'JAI', 'Lucknow': 'LKO', 'Goa': 'GOI', 'Kochi': 'COK'
                        };
                        const fromCode = AIRPORT_MAP[activeItinerary?.from || ''] || 'BOM';
                        const toCode = AIRPORT_MAP[activeItinerary?.to || ''] || 'DEL';
                        const tripType = activeItinerary?.endDate ? 'R' : 'O';
                        const params = new URLSearchParams({
                          from: `${activeItinerary?.from}, India[${fromCode}]`,
                          to: `${activeItinerary?.to}, India[${toCode}]`,
                          departure_date: new Date(activeItinerary?.startDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                          adult: adultCount.toString(),
                          child: kidCount.toString(),
                          infant: '0', class: 'Economy', tripType, search_currency: 'INR', fromCountry: 'IN', toCountry: 'IN', fare: 'N'
                        });
                        window.open(`https://riya.travel/in/routes/search?${params.toString()}`, '_blank');
                      }}
                      className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-[9px] font-black uppercase hover:bg-sky-500/20 transition-all flex items-center gap-1"
                    >
                      <Plane className="w-3 h-3" />
                      Riya
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onBookAndPay(item);
                    }}
                    className={`px-4 py-2 ${colorUi[item.color]?.cta || colorUi.blue.cta} rounded-lg text-[10px] font-black uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-md`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <Compass className="w-6 h-6 text-slate-500 animate-pulse" />
          </div>
          <div>
            <p className="text-base font-medium text-[#003366]">Sourcing Live Options...</p>
            <p className="text-caption max-w-[240px] mx-auto mt-1">Our AI concierge is checking real-time availability for your selected dates.</p>
          </div>
          <button 
            onClick={() => {
              const aiStore = (window as any).useAIBrainStore?.getState();
              if (aiStore) aiStore.addMessage({ role: 'user', content: 'Sync my booking options. I am ready to book now.' });
            }}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Re-Sync with AI
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
              <h3 className="text-sm font-bold text-[#003366] tracking-tight uppercase tracking-[0.1em]">Passenger Manifest</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{totalCount} Travelers Registered</p>
            </div>
          </div>
          {totalCount === 1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Shield Active</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3 px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Full Name (As per ID)</div>
            <div className="col-span-2">Gender</div>
            <div className="col-span-2">Age</div>
            <div className="col-span-3 text-right">Actions</div>
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
                      placeholder={p.type === 'adult' ? "Adult Name" : "Kid Name"}
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
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input 
                    type="number" 
                    placeholder="Age"
                    value={p.age}
                    onChange={(e) => updatePassenger(idx, { age: e.target.value })}
                    className="w-full bg-transparent border-none text-[10px] text-zinc-500 placeholder:text-zinc-700 focus:ring-0 font-black italic"
                  />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2 pr-2">
                   {p.name.length > 2 ? (
                     <div className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-600/20 rounded">
                       <span className="text-[7px] font-black text-blue-600 uppercase tracking-tighter">Ready</span>
                     </div>
                   ) : (
                     <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tighter">Pending</span>
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
              <h4 className="text-xs font-bold text-[#003366] uppercase tracking-tight">TourPlan Shield (Solo Traveler)</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              "Solo travelers receive automated check-ins via Telegram and priority support at destinations. Your emergency contact will be notified of arrival/departure automatically."
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
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Ready for Booking?</p>
              <h3 className="text-sm font-bold text-[#003366] tracking-tight">Connect Telegram Concierge</h3>
            </div>
          </div>
          <div className="px-2 py-1 bg-sky-500/20 rounded-lg border border-sky-500/20">
            <span className="text-[8px] font-black text-sky-400 uppercase">Recommended</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed italic">
          "Receive your final PNRs, live weather alerts, and dynamic itinerary updates directly via Telegram. This ensures you're never confused during travel."
        </p>

        {typeof process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME === 'string' &&
          process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME.trim().length > 0 && (
            <p className="text-[10px] text-slate-500 leading-snug">
              Bot configured in{' '}
              <span className="font-mono text-zinc-400">.env.local</span>: open{' '}
              <span className="text-sky-400 font-mono font-semibold">
                @{process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME.trim().replace(/^@/, '')}
              </span>{' '}
              in Telegram and tap <strong className="text-slate-600">Start</strong> once so outbound alerts can reach you.
            </p>
          )}

        <div className="flex gap-2">
          <div className="relative flex-1">
             <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">@</span>
             <input 
               type="text" 
               placeholder="Enter Username or Number"
               value={telegramIdInput}
               onChange={(e) => setTelegramIdInput(e.target.value)}
               disabled={!!telegramId}
               className={`w-full bg-white/50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-xs text-[#003366] placeholder:text-zinc-600 focus:border-sky-500/50 outline-none transition-all font-mono ${telegramId ? 'opacity-50' : ''}`}
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
                    .from('tourplan_profiles')
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
              const normalized = normalizeTelegramContact(telegramIdInput);
              if (normalized.length < 3) {
                toast.error('Invalid ID', { description: 'Enter your Telegram username or a phone number with country code.' });
                return;
              }
              setLinkingTelegram(true);
              try {
                patchTourGuide({ telegramId: normalized });
                setInputs((p) => ({ ...p, telegramId: normalized }));
                setTelegramIdInput(normalized);

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
                  const { data, error } = await supabase
                    .from('tourplan_profiles')
                    .upsert(
                      {
                        user_id: user.id,
                        full_name: fullName,
                        telegram_id: normalized,
                        telegram_enabled: true,
                        telegram_optin_at: now,
                        updated_at: now,
                      },
                      { onConflict: 'user_id' },
                    )
                    .select('id');

                  if (!error && data?.length) {
                    syncOk = true;
                  } else {
                    if (error) console.warn('[telegram] profile upsert', error);
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
                  }

                  if (syncOk) {
                    toast.success('Telegram connected', {
                      description: 'You’ll receive booking alerts at this handle when messages are enabled.',
                    });
                  } else {
                    toast.success('Saved in app', {
                      description:
                        'Could not sync to cloud profile yet — in Supabase SQL Editor run frontend/supabase/migrations/20260503100000_tourplan_profiles_insert_unique.sql and confirm SUPABASE_SERVICE_ROLE_KEY is set.',
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
            {linkingTelegram ? '…' : telegramId ? 'Disconnect' : 'Connect'}
          </button>
        </div>
        
        <p className="text-[9px] text-zinc-600 text-center font-medium">
          Secured with 256-bit encryption • No spam, only travel intelligence
        </p>
      </motion.div>

      <div className="pt-10 border-t border-slate-200 flex flex-col gap-3">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-2">Select Checkout Provider</p>
        
        <div className="flex flex-col md:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => onBookAndPay('razorpay_review')}
            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-[#003366] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 italic"
          >
            <Zap className="w-3.5 h-3.5" />
            Finalize & Pay with Razorpay
          </button>

          <button
            type="button"
            onClick={() => onBookAndPay('riya')}
            className="flex-1 py-3.5 bg-gradient-to-r from-blue-700 to-blue-800 text-[#003366] rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-2xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl italic"
          >
            <Plane className="w-3.5 h-3.5" />
            Riya Travel Gateway
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          Razorpay checkout opens on the next screen once your booking is saved (sign-in required).
        </p>

        <button
          onClick={onBack}
          className="w-full py-5 mt-4 bg-gradient-to-r from-cyan-500 via-white to-green-600 rounded-[2rem] text-zinc-950 font-black text-xs uppercase shadow-xl shadow-cyan-500/10 transition-all active:scale-[0.98]"
        >
          ← {t('back_to_marketplace')}
        </button>
      </div>
    </motion.div>
  );
}
