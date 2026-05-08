'use client';

import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OTPAuth from '@/components/auth/OTPAuth';

export default function EmailAuthPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-zinc-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Tricolour Mesh Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF9933]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#138808]/10 rounded-full blur-[120px] pointer-events-none" />

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
          <span className="text-xs font-black uppercase tracking-widest">Back to Home</span>
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-500/5 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-6 border border-orange-500/10">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-zinc-900">Email Access</h1>
          <p className="text-zinc-500 text-sm font-medium">Verify your identity via secure magic link or OTP</p>
        </div>

        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-xl shadow-zinc-900/5">
          <OTPAuth initialMethod="email" hideToggle={true} />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em]">
            TourPlan Secure Intelligence Network
          </p>
        </div>
      </motion.div>
    </div>
  );
}
