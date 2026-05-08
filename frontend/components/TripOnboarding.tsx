'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Wallet, ArrowRight, Sparkles, 
  Map, Plane, Train, Hotel, Star, Shield, Info, MessageSquare, Phone, Send
} from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

const BUDGETS = [
  { id: 'Kshatriya', label: 'Premium', desc: 'Luxury & Comfort', icon: Star, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { id: 'Vaisya', label: 'Business', desc: 'Efficiency & Quality', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'Brahmin', label: 'Budget', desc: 'Experience & Value', icon: Info, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
] as const;

export default function TripOnboarding() {
  const { user } = useAuth();
  const { 
    setDestination, setDates, setBudget, setOnboarded, setTelegram 
  } = useTripStore();

  const [step, setStep] = useState(1);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [form, setForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: 'Vaisya' as 'Kshatriya' | 'Vaisya' | 'Brahmin',
    telegram: false,
    phone: '',
  });

  const handleComplete = async () => {
    if (!form.destination || !form.startDate || !form.endDate) {
      setStep(1);
      return toast.error('Please fill all trip details');
    }

    if (form.telegram && (!form.phone || form.phone.length < 5)) {
        return toast.error('Please enter a valid Telegram ID or number');
    }
    
    // ── Local State Update ───────────────────────────────────────────
    setDestination(form.destination);
    setDates(form.startDate, form.endDate);
    setBudget(form.budget);
    setTelegram(form.telegram, form.phone || null);
    
    // ── Supabase Persistence ─────────────────────────────────────────
    if (user) {
      try {
        const now = new Date().toISOString();
        const payload: Record<string, unknown> = {
          user_id: user.id,
          travel_style: form.budget.toLowerCase(),
          preferred_language: 'hi',
          updated_at: now,
        };
        if (form.telegram && form.phone) {
          payload.telegram_enabled = true;
          payload.telegram_id = form.phone;
          payload.telegram_optin_at = now;
        }
        const { error: profileError } = await supabase
          .from('yatra_profiles')
          .upsert(payload, { onConflict: 'user_id' });

        if (profileError) console.error('Profile sync error:', profileError);
      } catch (err) {
        console.error('Supabase upsert failed:', err);
      }
    }

    setOnboarded(true);
    toast.success('Intelligence Synced to Supabase! 🧠✨');
  };

  const nextStep = () => {
    if (step === 1 && !form.destination) return toast.error('Where are you going?');
    if (step === 2 && (!form.startDate || !form.endDate)) return toast.error('Select your travel dates');
    setStep(step + 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.15)_0%,transparent_50%)] pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xl glass-panel p-8 sm:p-12 space-y-10 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none" />

        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-blue-500' : 'w-1.5 bg-zinc-800'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                  <MapPin className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-3xl font-black text-white">Where to?</h2>
                <p className="text-sm text-zinc-500">Your AI trip architecture begins with a destination.</p>
              </div>

              <div className="relative group">
                <Map className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Enter your destination"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-6 py-6 text-xl text-white outline-none focus:border-blue-500/50 transition-all placeholder-zinc-800"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setOnboarded(true);
                    toast.info('Quick Start Active', { description: 'Entering the Planning Studio directly.' });
                  }}
                  className="w-full py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors border border-zinc-900 rounded-2xl hover:bg-white/5"
                >
                  ⚡ Skip to Planning Studio
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Calendar className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black text-white">When?</h2>
                <p className="text-sm text-zinc-500">Dates are critical for Tatkal prediction & hotel occupancy.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Departure</label>
                  <input 
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-white outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Return</label>
                  <input 
                    type="date"
                    min={form.startDate || new Date().toISOString().split('T')[0]}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-white outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Wallet className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white">Your Style?</h2>
                <p className="text-sm text-zinc-500">AI brain adjusts its recommendations based on your budget tier.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {BUDGETS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setForm({ ...form, budget: b.id })}
                    className={`flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all text-left group ${form.budget === b.id ? `${b.bg} ${b.color}` : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                  >
                    <div className={`p-3 rounded-xl ${form.budget === b.id ? 'bg-white/10' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
                      <b.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-widest">{b.label}</p>
                      <p className="text-[11px] opacity-60 leading-tight">{b.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#0088cc]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#0088cc]/20">
                  <Send className="w-8 h-8 text-[#0088cc]" />
                </div>
                <h2 className="text-3xl font-black text-white">Telegram Sync?</h2>
                <p className="text-sm text-zinc-500">Get AI itinerary updates and price alerts directly on Telegram.</p>
              </div>

              {!showPhoneInput ? (
                <div className="bg-[#0088cc]/10 border border-[#0088cc]/25 rounded-[1.75rem] p-6 space-y-4">
                  <p className="text-sm text-zinc-300 leading-relaxed text-center">
                    Enable Telegram integration to receive real-time notifications and chat with your AI Brain on the go.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                          setForm({ ...form, telegram: true });
                          setShowPhoneInput(true);
                      }}
                      className="w-full py-4 bg-[#0088cc] text-white font-black text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Yes, Sync to Telegram
                    </button>
                    <button
                      onClick={() => handleComplete()}
                      className="w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold text-sm rounded-2xl hover:text-white transition-all"
                    >
                      No, I'll use only web
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="space-y-4"
                >
                    <div className="relative group">
                        <Send className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-[#0088cc] transition-colors" />
                        <span className="absolute left-14 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">@</span>
                        <input 
                            type="text" 
                            placeholder="Telegram ID or Number"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-20 pr-6 py-6 text-xl text-white outline-none focus:border-[#0088cc]/50 transition-all placeholder-zinc-800"
                        />
                    </div>
                    <button
                      onClick={handleComplete}
                      className="w-full py-5 bg-[#0088cc] text-white rounded-2xl font-black text-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                       Confirm & Activate AI Brain
                    </button>
                    <button 
                       onClick={() => setShowPhoneInput(false)}
                       className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                    >
                       ← Go Back
                    </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {step < 4 && (
          <button
            onClick={nextStep}
            className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.75rem] font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(37,99,235,0.25)] flex items-center justify-center gap-3"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <p className="text-[9px] text-zinc-700 text-center uppercase tracking-[0.2em]">
          Powered by Yatra Intelligence Engine
        </p>
      </motion.div>
    </motion.div>
  );
}
