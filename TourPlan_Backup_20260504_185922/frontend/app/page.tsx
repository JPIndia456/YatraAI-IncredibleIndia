'use client';

import { motion } from 'framer-motion';
import { Sparkles, Globe, Zap, ShieldCheck, Heart, ArrowRight, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTripStore, useAIBrainStore } from '@/lib/store';
import { getPlannerWizardSchema } from '@/lib/wizardSchema';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authRef = useRef<HTMLDivElement>(null);

  const { setOrigin, setDestination, setDates, setTravelType } = useTripStore();
  const { setOpen, setWizardMode, registerWizardSchema, registerInputUpdateHandler } = useAIBrainStore();

  useEffect(() => {
    const schema = getPlannerWizardSchema();
    registerWizardSchema(schema);

    registerInputUpdateHandler((id, val) => {
      if (id === 'tripType') setTravelType(val as any);
      else if (id === 'origin') setOrigin(String(val));
      else if (id === 'specificDest') setDestination(String(val));
      else if (id === 'startDate') setDates(String(val), '');
    });

    return () => {
      registerWizardSchema([]);
      registerInputUpdateHandler(null);
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[999]">
        <div className="w-10 h-10 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-zinc-900 selection:bg-orange-500/30 overflow-x-hidden font-sans">
      {/* ── LIGHT TRICOLOUR HERO SECTION ── */}
      <section className="relative min-h-[60svh] flex flex-col items-center justify-center px-6 pt-10 pb-4 overflow-hidden">
        {/* Subtle Tricolour Mesh Background */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF9933]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#138808]/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-orange-500/5 border border-orange-500/10 text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 mb-4"
          >
            <Sparkles className="w-2.5 h-2.5" /> Intelligence Network
          </motion.div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 tracking-tighter leading-[0.95]">
            Incredible<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9933] via-zinc-900 to-[#138808]">INDIA.</span>
          </h1>
          
          <p className="text-xs sm:text-base text-zinc-500 mb-6 max-w-lg mx-auto font-medium leading-relaxed">
            Personalized itineraries with real-time grounding. The future of exploration is here.
          </p>

          <div className="flex justify-center w-full max-w-sm mx-auto">
            <button 
              onClick={() => authRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-center gap-3 px-8 py-3.5 bg-zinc-900 text-white rounded-xl font-black text-xs hover:bg-orange-600 transition-all group shadow-xl shadow-zinc-900/10"
            >
              Start Your Odyssey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── SIMPLE COMPACT FEATURES ── */}
      <section className="py-2 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: <Zap className="w-5 h-5 text-orange-500" />, title: "Smart AI", desc: "Intelligent planning" },
            { icon: <Globe className="w-5 h-5 text-blue-500" />, title: "Bhashini", desc: "Native support" },
            { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, title: "Live Sync", desc: "Real-time updates" },
            { icon: <Heart className="w-5 h-5 text-red-500" />, title: "Mission", desc: "Culture & tech" }
          ].map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-zinc-100 shadow-sm"
            >
              <div className="shrink-0">{item.icon}</div>
              <div className="overflow-hidden">
                <div className="text-xs font-black uppercase tracking-wider truncate text-zinc-800">{item.title}</div>
                <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMPACT AUTH SECTION ── */}
      <section ref={authRef} className="py-8 px-6 relative">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-black mb-1 tracking-tight text-zinc-900">Access Control</h2>
          <p className="text-zinc-500 text-[10px] mb-6 font-medium">Select your secure authorization path</p>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => router.push('/auth/email')}
              className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white border border-zinc-100 hover:border-orange-500/30 hover:bg-orange-50/50 transition-all group shadow-sm"
            >
              <div className="w-10 h-10 bg-orange-500/5 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xs text-zinc-900">Email</div>
                <div className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5 font-black">OTP / Link</div>
              </div>
            </button>

            <button 
              onClick={() => router.push('/auth/phone')}
              className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white border border-zinc-100 hover:border-emerald-500/30 hover:bg-emerald-50/50 transition-all group shadow-sm"
            >
              <div className="w-10 h-10 bg-emerald-500/5 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xs text-zinc-900">Phone</div>
                <div className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5 font-black">SMS Code</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── MINIMAL FOOTER ── */}
      <footer className="py-8 border-t border-zinc-100 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 opacity-50">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Sparkles className="w-3.5 h-3.5" /> TourPlan
          </div>
          <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest text-zinc-400">
            <a href="/legal" className="hover:text-zinc-900 transition-colors">Legal</a>
            <a href="/legal" className="hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="/profile" className="hover:text-zinc-900 transition-colors">Account</a>
          </div>
          <div className="text-[9px] font-medium tracking-tight text-zinc-400">© 2026 Incredible India</div>
        </div>
      </footer>
    </div>
  );
}
