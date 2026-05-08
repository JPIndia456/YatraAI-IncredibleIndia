'use client';

import { useRealtimePnr } from '@/hooks/useRealtimePnr';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function BookingConfirmation({ bookingId, pnr }: any) {
  const { pnrStatus, isConnected } = useRealtimePnr(bookingId);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="shell-panel max-w-md mx-auto p-8 text-center bg-zinc-900/40 border-white/5 shadow-2xl"
    >
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
      </div>
      
      <h1 className="text-xl font-black text-white uppercase tracking-widest mb-1">Booking Secured</h1>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Transaction Hash: {bookingId?.slice(0,12)}</p>
      
      {pnr && (
        <div className="mt-6 py-4 px-6 bg-zinc-950/50 border border-white/5 rounded-2xl">
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Live PNR Number</div>
          <div className="text-2xl font-black text-emerald-400 tracking-[0.2em]">{pnr}</div>
        </div>
      )}

      {pnrStatus && (
        <div className="mt-4 p-4 bg-zinc-900/60 rounded-xl border border-white/5 animate-in fade-in duration-700">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 font-bold uppercase">Current Status</span>
            <span className="text-emerald-400 font-black">{pnrStatus.status}</span>
          </div>
          {pnrStatus.coach && (
            <div className="flex justify-between items-center text-[10px] mt-2">
              <span className="text-zinc-500 font-bold uppercase">Coach / Seat</span>
              <span className="text-white font-black">{pnrStatus.coach}</span>
            </div>
          )}
        </div>
      )}

      {/* AI Automation Teaser */}
      <div className="mt-8 p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-8 h-8 text-blue-400" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">TourPlan Concierge</span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed text-left">
          Analyzing destination weather and heritage secrets. Your dynamic itinerary update will sync to Telegram shortly.
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
        Realtime updates enabled • Check "My Trips"
      </div>
    </motion.div>
  );
}
