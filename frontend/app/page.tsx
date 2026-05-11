'use client';

import { motion } from 'framer-motion';
import { Sparkles, Globe, Zap, ShieldCheck, Heart, ArrowRight, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTripStore, useAIBrainStore } from '@/lib/store';


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
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A2E] selection:bg-orange-500/30 overflow-x-hidden font-sans">
      {/* ── TOP TRICOLOUR STRIPE ── */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] flex">
        <div className="flex-1 bg-[#FF671F]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#046A38]" />
      </div>

      {/* ── CUSTOM HEADER FOR LANDING ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFB]/80 backdrop-blur-md border-b border-orange-100 px-6 py-4 pt-[7px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black tracking-[-0.05em] text-[#FF9933] uppercase">Yatra</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-wider text-[#FF671F] hover:bg-orange-100 transition-colors">
              {language?.toUpperCase() || 'EN'}
            </button>
            <button 
              onClick={() => authRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FF671F] to-[#046A38] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center gap-2"
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
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FF671F]/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#046A38]/10 rounded-full blur-[160px]" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#000080]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full text-center"
        >
          <h1 className="text-7xl sm:text-9xl md:text-[10rem] font-black mb-12 tracking-[-0.06em] leading-[0.75] flex flex-col items-center">
            <span className="text-[#FF9933] drop-shadow-2xl uppercase">Discover</span>
            <span className="text-[#000080]/90 text-4xl sm:text-7xl md:text-8xl uppercase tracking-[-0.04em] my-4">Incredible</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#046A38] to-[#024a27] uppercase drop-shadow-2xl">India</span>
          </h1>
          
          <p className="text-lg sm:text-2xl text-[#000080]/80 mb-6 font-black tracking-tight uppercase">
            {t('personalized_itineraries')}
          </p>

          <p className="text-sm sm:text-lg text-[#000080]/60 mb-12 max-w-3xl mx-auto font-bold leading-relaxed italic">
            {t('plan_perfect_detour')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-6">
            {[
              { icon: <Zap className="w-4 h-4 text-[#FF671F]" />, title: t('landing_smart_ai'), desc: t('landing_smart_ai_desc') },
              { icon: <Globe className="w-4 h-4 text-blue-500" />, title: t('landing_bhashini'), desc: t('landing_bhashini_desc') },
              { icon: <ShieldCheck className="w-4 h-4 text-[#046A38]" />, title: t('landing_live_sync'), desc: t('landing_live_sync_desc') },
              { icon: <Heart className="w-4 h-4 text-red-500" />, title: t('landing_mission'), desc: t('landing_mission_desc') }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-orange-100 shadow-sm"
              >
                <div className="shrink-0 p-2 bg-orange-50 rounded-xl">{item.icon}</div>
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] font-black uppercase tracking-wider truncate text-[#000080]">{item.title}</div>
                  <div className="text-[9px] text-[#000080]/40 truncate font-medium">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center w-full mt-8">
            <button 
              onClick={() => authRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-6 px-16 py-8 bg-[#000080] text-white rounded-[2.5rem] font-black text-sm uppercase hover:bg-[#000060] transition-all group shadow-[0_20px_50px_rgba(0,0,128,0.3)] hover:-translate-y-1"
            >
              {t('start_odyssey')}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform text-[#FF9933]" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── ACCESS CONTROL SECTION ── */}
      <section ref={authRef} className="py-8 px-6 relative">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-black mb-1 tracking-tight text-[#000080]">{t('access_control')}</h2>
          <p className="text-[#000080]/50 text-[10px] mb-6 font-medium">{t('secure_auth_path')}</p>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => router.push('/auth/email')}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border border-orange-100 hover:border-[#FF671F]/50 hover:bg-orange-50/20 transition-all group shadow-sm hover:shadow-xl"
            >
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-300 group-hover:text-[#FF671F] group-hover:scale-110 transition-all">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="font-black text-xs text-[#000080]">{t('email')}</div>
                <div className="text-[8px] text-[#000080]/40 uppercase tracking-widest font-black mt-0.5">{t('landing_otp_link')}</div>
              </div>
            </button>

            <button 
              onClick={() => router.push('/auth/phone')}
              className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border border-orange-100 hover:border-[#046A38]/50 hover:bg-emerald-50/20 transition-all group shadow-sm hover:shadow-xl"
            >
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-300 group-hover:text-[#046A38] group-hover:scale-110 transition-all">
                <Phone className="w-6 h-6" />
              </div>
              <div className="text-center">
                <div className="font-black text-xs text-[#000080]">{t('phone')}</div>
                <div className="text-[8px] text-[#000080]/40 uppercase tracking-widest font-black mt-0.5">{t('landing_sms_code')}</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-orange-100 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#FF671F]/50">
            <Sparkles className="w-4 h-4" /> Yatra
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-[#000080]/40">
            <a href="/legal" className="hover:text-[#FF671F] transition-colors">{t('legal')}</a>
            <a href="/legal" className="hover:text-[#FF671F] transition-colors">{t('privacy')}</a>
            <a href="/profile" className="hover:text-[#FF671F] transition-colors">{t('account')}</a>
          </div>
          <div className="text-[10px] font-bold tracking-tight text-orange-200">{t('landing_copyright')}</div>
        </div>
      </footer>
    </div>
  );
}
