'use client';

import { useTripPlannerStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Download, Share2, ArrowLeft, Heart, Shield, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ItineraryPreview() {
  const router = useRouter();
  const { activeItinerary: plan } = useTripPlannerStore();

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white p-6 text-center">
        <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="text-cyan-400" size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2">No Active Itinerary Found</h1>
        <p className="text-zinc-400 mb-8 max-w-md">Please generate an itinerary in the TourPlan Studio first to view it in this interactive mode.</p>
        <button onClick={() => router.push('/planner')} className="px-8 py-3 bg-cyan-600 rounded-full font-bold hover:bg-cyan-700 transition-all">
          Go to Studio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-zinc-200 pb-20">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-cyan-500 px-2 py-0.5 rounded text-black uppercase tracking-tighter">TourPlan 2026</span>
          <span className="text-sm font-bold">Interactive Pass</span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-white/5 rounded-full transition-all text-rose-400">
            <Heart size={20} />
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
        <img 
          src={`https://source.unsplash.com/featured/?india,${plan.destination}`} 
          alt={plan.destination}
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute bottom-8 left-6 z-20">
          <h1 className="text-4xl font-black mb-2 tracking-tight">{plan.destination}</h1>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
            <span className="flex items-center gap-1"><Calendar size={14} /> {plan.duration}</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> India</span>
          </div>
        </div>
      </div>

      <main className="px-6 -mt-4 relative z-30">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Total Estimate</p>
            <p className="text-xl font-bold text-cyan-400">{plan.totalEstimate}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Best Time</p>
            <p className="text-xl font-bold text-emerald-400">{plan.bestTime}</p>
          </div>
        </div>

        {/* Day Wise Timeline */}
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
          <Clock size={14} /> Day-by-Day Journey
        </h2>

        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
          {plan.dayPlan.map((day, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative pl-10"
            >
              <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center z-10">
                <span className="text-[10px] font-bold">{day.day}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-default group">
                <h3 className="text-lg font-bold mb-4 group-hover:text-indigo-400 transition-colors">{day.title}</h3>
                <h3 className="text-lg font-bold mb-4 group-hover:text-cyan-400 transition-colors">{day.title}</h3>
                <div className="space-y-4">
                  {day.activities.map((act, aIdx) => (
                    <div key={aIdx} className="flex gap-4">
                      <div className="text-[10px] font-black text-zinc-500 w-12 pt-1">{act.time}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">{act.activity}</p>
                        {act.cost && <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-emerald-400">Est. {act.cost}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Safety & Tips */}
        <div className="mt-12 bg-cyan-500/10 border border-cyan-500/20 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-cyan-400" size={24} />
            <h2 className="font-bold">Safety & Pro Tips</h2>
          </div>
          <ul className="space-y-3">
            {plan.safety.tips.slice(0, 3).map((tip, idx) => (
              <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2 italic">
                <span>•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Action Footer */}
      <footer className="fixed bottom-0 inset-x-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 flex gap-4">
        <button className="flex-1 bg-white text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <Download size={20} /> Save PDF
        </button>
        <button className="w-16 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
          <Share2 size={24} />
        </button>
      </footer>
    </div>
  );
}
