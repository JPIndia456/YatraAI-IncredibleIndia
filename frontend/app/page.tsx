'use client';

import { motion } from 'framer-motion';
import { Sparkles, Globe, Zap, ShieldCheck, Heart, ArrowRight, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTripStore, useAIBrainStore, useTripPlannerStore } from '@/lib/store';


export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { language, t } = useLanguage();
  const authRef = useRef<HTMLDivElement>(null);

  const { setOrigin, setDestination, setDates, setTravelType } = useTripStore();
  const { setOpen, setWizardMode, registerWizardSchema, registerInputUpdateHandler } = useAIBrainStore();

  useEffect(() => {
    registerWizardSchema([]);
    setWizardMode(false);

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
    <div className="min-h-screen bg-[#FDFDFB] text-[#000080] selection:bg-[#FF9933]/30 overflow-x-hidden font-sans">
      {/* ── TOP TRICOLOUR STRIPE ── */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ── CUSTOM HEADER FOR LANDING ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFB]/80 backdrop-blur-md border-b border-[#FF9933]/10 px-6 py-4 pt-[7px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black tracking-[-0.05em] text-[#FF9933] uppercase">Yatra</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-full bg-[#FF9933]/5 border border-[#FF9933]/10 text-[10px] font-black uppercase tracking-wider text-[#FF9933] hover:bg-[#FF9933]/10 transition-colors">
              {language?.toUpperCase() || 'EN'}
            </button>
            <button 
              onClick={() => authRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FF9933] to-[#138808] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <User className="w-3 h-3" />
              {t('sign_in')} <span className="opacity-70 font-medium">{t('traveler')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[50svh] flex flex-col items-center justify-center px-6 pt-20 pb-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FF9933]/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#138808]/10 rounded-full blur-[160px]" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#000080]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full text-center"
        >
          <h1 className="text-5xl sm:text-7xl md:text-[9rem] font-black mb-8 flex flex-col items-center pt-8 relative">
            <span className="text-[#FF9933] text-4xl sm:text-5xl md:text-[3.5rem] uppercase mb-0 tracking-widest opacity-90">Discover</span>
            <span className="text-[#000080] text-xl sm:text-2xl md:text-2xl uppercase mb-6 tracking-[0.3em] font-black">Incredible</span>
            
            <div className="relative inline-flex items-center tracking-[-0.05em] leading-none drop-shadow-[0_15px_25px_rgba(0,0,0,0.08)]">
              <span className="text-[#FF671F]">IND</span>
              <span className="text-[#046A38]">IA</span>
              
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF671F]/5 to-[#046A38]/5 blur-[100px] -z-10" />
            </div>
          </h1>
          
          <p className="text-lg sm:text-2xl text-[#000080]/80 mb-1 font-black tracking-tight uppercase">
            {t('personalized_itineraries')}
          </p>

          <p className="text-sm sm:text-lg text-[#000080]/85 mb-2 max-w-3xl mx-auto font-bold leading-relaxed italic">
            {t('plan_perfect_detour')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[75rem] mx-auto mb-16 px-6">
            {[
              { icon: <Zap className="w-6 h-6 text-[#FF9933]" />, title: t('landing_smart_ai'), desc: t('landing_smart_ai_desc') },
              { icon: <Globe className="w-6 h-6 text-blue-500" />, title: t('landing_bhashini'), desc: t('landing_bhashini_desc') },
              { icon: <ShieldCheck className="w-6 h-6 text-[#138808]" />, title: t('landing_live_sync'), desc: t('landing_live_sync_desc') },
              { icon: <Heart className="w-6 h-6 text-red-500" />, title: t('landing_mission'), desc: t('landing_mission_desc') }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -4, scale: 1.02 }}
                className="flex flex-col items-center text-center p-6 rounded-[2rem] bg-white border border-[#FF9933]/15 shadow-[0_10px_30px_-15px_rgba(255,153,51,0.1)] transition-all min-h-[150px] justify-center"
              >
                <div className="shrink-0 p-3 bg-[#FF9933]/5 rounded-2xl mb-3">{item.icon}</div>
                <div className="space-y-1">
                  <div className="text-[18px] font-black uppercase tracking-tight text-[#000080] leading-tight">{item.title}</div>
                  <div className="text-[12px] text-[#000080]/60 font-bold leading-snug max-w-[160px] mx-auto">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full mt-12">
            <button 
              onClick={() => router.push('/auth/email')}
              className="flex items-center justify-center gap-6 px-12 py-8 bg-[#000080] text-white rounded-[2.5rem] font-black text-sm uppercase hover:bg-[#000060] transition-all group shadow-[0_20px_50px_rgba(0,0,128,0.3)] hover:-translate-y-1 w-full sm:w-auto"
            >
              {t('start_odyssey')}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform text-[#FF9933]" />
            </button>

            <button 
              onClick={() => router.push('/auth/email')}
              className="flex items-center gap-4 p-4 pr-8 rounded-[2.5rem] bg-white border border-[#FF9933]/20 hover:border-[#FF9933]/50 hover:bg-[#FF9933]/5 transition-all group shadow-xl hover:-translate-y-1 w-full sm:w-auto"
            >
              <div className="w-14 h-14 bg-[#FF9933]/10 rounded-full flex items-center justify-center text-[#FF9933] group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-black text-xs text-[#000080] uppercase tracking-wider">{t('email')}</div>
                <div className="text-[10px] text-[#000080]/40 font-bold uppercase tracking-widest">{t('landing_otp_link')}</div>
              </div>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-[#FF9933]/10 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#FF9933]/50">
            <Sparkles className="w-4 h-4" /> Yatra
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-[#000080]/40">
            <a href="/legal" className="hover:text-[#FF9933] transition-colors">{t('legal')}</a>
            <a href="/legal" className="hover:text-[#FF9933] transition-colors">{t('privacy')}</a>
            <button 
              onClick={() => {
                useTripPlannerStore.getState().setIsProfileOpen(true);
                router.push('/planner');
              }}
              className="hover:text-[#FF9933] transition-colors"
            >
              {t('account')}
            </button>
          </div>
          <div className="text-[10px] font-bold tracking-tight text-orange-200">{t('landing_copyright')}</div>
        </div>
      </footer>
    </div>
  );
}
