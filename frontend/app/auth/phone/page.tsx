'use client';

import { motion } from 'framer-motion';
import { Phone, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OTPAuth from '@/components/auth/OTPAuth';
import { useLanguage } from '@/contexts/LanguageContext';

import { useState, useEffect } from 'react';

export default function PhoneAuthPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-zinc-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Tricolour Mesh Background */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#FF9933]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#138808]/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest" suppressHydrationWarning>
            {mounted ? t('auth_back_to_home') : 'Back to Home'}
          </span>
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500/5 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6 border border-emerald-500/10">
            <Phone className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-zinc-900" suppressHydrationWarning>
            {mounted ? t('auth_mobile_access') : 'Mobile Access'}
          </h1>
          <p className="text-zinc-500 text-sm font-medium" suppressHydrationWarning>
            {mounted ? t('auth_mobile_access_desc') : 'Fast, secure authorization via 6-digit SMS code'}
          </p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-xl shadow-zinc-900/5">
          <OTPAuth initialMethod="phone" hideToggle={true} />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em]" suppressHydrationWarning>
            {mounted ? t('auth_secure_network') : 'Yatra Secure Intelligence Network'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
