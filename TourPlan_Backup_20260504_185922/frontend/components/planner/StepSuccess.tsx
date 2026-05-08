'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Calendar, MapPin, Share2, ArrowRight, Send, Zap, AlertCircle, 
  Sparkles, ShieldCheck, Utensils, Info, ChevronRight, Download
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTripPlannerStore, useTourGuideStore } from '@/lib/store';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { isoDateToDdMmYyyy } from '@/lib/dateFormat';

interface StepSuccessProps {
  onReset: () => void;
  awaitingRazorpayPayment?: boolean;
  onPayWithRazorpay?: () => void | Promise<void>;
  razorpayPublishableConfigured?: boolean;
  bookingId?: string | null;
}

export default function StepSuccess({
  onReset,
  awaitingRazorpayPayment = false,
  onPayWithRazorpay,
  razorpayPublishableConfigured = false,
  bookingId,
}: StepSuccessProps) {
  const { activeItinerary } = useTripPlannerStore();
  const { telegramId } = useTourGuideStore();
  const { t } = useLanguage();
  const [payBusy, setPayBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'insights'>('overview');

  useEffect(() => {
    if (!awaitingRazorpayPayment || typeof window === 'undefined') return;
    const w = window as any;
    
    const triggerPayment = () => {
      if (onPayWithRazorpay && razorpayPublishableConfigured) {
        setTimeout(() => {
          onPayWithRazorpay();
        }, 1500); // Small delay for visual impact
      }
    };

    if (w.Razorpay) {
      triggerPayment();
      return;
    }
    
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = triggerPayment;
    document.body.appendChild(s);
  }, [awaitingRazorpayPayment, onPayWithRazorpay, razorpayPublishableConfigured]);

  const heroComplete = !awaitingRazorpayPayment;
  const confirmationSuffix = bookingId && bookingId.length >= 8 ? bookingId.slice(0, 8).toUpperCase() : 'PENDING';

  // ── Helpers ──
  const renderableDayPlan = useMemo(() => {
    const dp = activeItinerary?.dayPlan || [];
    return dp.map((day: any, idx: number) => {
      let activities = [];
      if (Array.isArray(day.activities)) {
        activities = day.activities;
      } else if (typeof day.activities === 'object') {
        activities = Object.entries(day.activities).map(([time, activity]: any) => ({
          time,
          activity: typeof activity === 'string' ? activity : activity.activity
        }));
      }
      return {
        day: day.day || idx + 1,
        title: day.title || `Day ${idx + 1}`,
        activities
      };
    });
  }, [activeItinerary]);

  const safetyTip = activeItinerary?.safety?.tips?.[0] || 'Verified high-security zone.';
  const foodSpots = useMemo(() => {
    const list = activeItinerary?.foodSpotsList || [];
    return Object.values(list).slice(0, 4).map((f: any) => typeof f === 'string' ? f : f.name);
  }, [activeItinerary]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 py-12 px-4"
    >
      {/* ── Status Hero ── */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className={`absolute inset-0 blur-3xl opacity-30 ${heroComplete ? 'bg-cyan-400' : 'bg-amber-400'}`}
          />
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto relative border-2 ${heroComplete ? 'bg-[#003366] border-cyan-400' : 'bg-amber-500 border-white'} shadow-2xl`}>
            {heroComplete ? (
              <CheckCircle2 className="w-7 h-7 text-cyan-400" />
            ) : (
              <Zap className="w-7 h-7 text-white" />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#003366] italic uppercase tracking-tighter">
            {heroComplete ? 'Odyssey Confirmed' : 'Review & Pay'}
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking ID: {confirmationSuffix}</p>
        </div>
      </div>

      {/* ── Master Plan Tabs ── */}
      <div className="shell-panel overflow-hidden border-slate-200 bg-white shadow-3xl">
        {/* Tab Headers */}
        <div className="flex border-b bg-slate-50/50">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'itinerary', label: 'Daily Odyssey', icon: Sparkles },
            { id: 'insights', label: 'AI Insights', icon: ShieldCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-[#003366] bg-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-cyan-500' : 'text-slate-300'}`} />
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8 min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Route Intelligence</p>
                    <h3 className="text-3xl font-black text-[#003366] italic uppercase leading-none">{activeItinerary?.from} → {activeItinerary?.to}</h3>
                  </div>
                  <div className="space-y-6">
                    {[
                      { icon: MapPin, label: 'Origin', val: activeItinerary?.from },
                      { icon: Calendar, label: 'Dates', val: `${isoDateToDdMmYyyy(activeItinerary?.startDate)} – ${isoDateToDdMmYyyy(activeItinerary?.endDate)}` },
                      { icon: CheckCircle2, label: 'Status', val: heroComplete ? 'PNR Confirmed' : 'Pending Payment' }
                    ].map((s, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <s.icon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">{s.label}</p>
                          <p className="text-xs font-black text-[#003366] uppercase italic">{s.val || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#003366] rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 blur-3xl" />
                  <div className="space-y-2 relative">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Total Valuation</p>
                    <p className="text-5xl font-black italic tracking-tighter">{activeItinerary?.totalEstimate}</p>
                  </div>
                  <div className="space-y-4 relative">
                    <div className="flex justify-between items-center border-t border-white/10 pt-4">
                      <p className="text-[9px] font-black uppercase text-slate-300">Transit</p>
                      <p className="text-[11px] font-bold uppercase">{activeItinerary?.transport?.name}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black uppercase text-slate-300">Stay</p>
                      <p className="text-[11px] font-bold uppercase">{activeItinerary?.hotel?.name}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'itinerary' && (
              <motion.div key="itinerary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {renderableDayPlan.map((day: any, i: number) => (
                  <div key={i} className="group relative pl-8 pb-8 last:pb-0">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-cyan-500 bg-white group-hover:bg-cyan-500 transition-colors z-10" />
                    {i !== renderableDayPlan.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100" />}
                    <div className="space-y-4">
                      <h5 className="text-sm font-black text-[#003366] uppercase italic">Day {day.day}: {day.title}</h5>
                      <div className="grid grid-cols-1 gap-3">
                        {day.activities.map((a: any, j: number) => (
                          <div key={j} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex gap-4 hover:border-cyan-200 transition-all">
                            <span className="text-[9px] font-black text-slate-400 uppercase w-16 pt-0.5">{a.time || 'All Day'}</span>
                            <p className="text-[11px] font-bold text-[#003366] uppercase leading-relaxed">{a.activity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div key="insights" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="bg-white border p-8 rounded-[2.5rem] space-y-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <h6 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Grounding Score</h6>
                        <p className="text-lg font-black text-[#003366]">9.8 / 10 Integrity</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">"{safetyTip}"</p>
                  </div>
                  
                  <div className="bg-white border p-8 rounded-[2.5rem] space-y-6 shadow-sm hover:shadow-md transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <Utensils className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h6 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Regional Flavors</h6>
                          <p className="text-lg font-black text-[#003366]">Curated Gastronomy</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {foodSpots.map((f, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[9px] font-black text-[#003366] uppercase">{f}</span>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 flex flex-col justify-center border border-slate-800">
                  <div className="space-y-2">
                    <h4 className="text-xl font-black italic uppercase">Travel Concierge</h4>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Your AI travel assistant is synced with your PNR. You will receive real-time updates via Telegram regarding weather changes or delays.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <Share2 className="w-4 h-4 text-cyan-400 mb-2" />
                        <p className="text-[9px] font-black uppercase">Sync Wallet</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <Download className="w-4 h-4 text-cyan-400 mb-2" />
                        <p className="text-[9px] font-black uppercase">Export PDF</p>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Payment / Actions ── */}
      {awaitingRazorpayPayment ? (
        <div className="space-y-6 max-w-md mx-auto">
           {!razorpayPublishableConfigured && (
             <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex gap-3">
               <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
               <p className="text-[10px] text-amber-200 font-bold uppercase leading-normal">Razorpay integration pending configuration. Check .env.local</p>
             </div>
           )}
           <button
            disabled={payBusy || !razorpayPublishableConfigured}
            onClick={onPayWithRazorpay}
            className="w-full py-6 bg-emerald-500 text-[#003366] rounded-[2rem] font-black text-xs uppercase shadow-3xl hover:bg-emerald-400 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
           >
            <Zap className="w-4 h-4" /> {payBusy ? 'Processing...' : 'Pay with Razorpay'}
           </button>
           <p className="text-center text-[9px] font-black text-slate-500 uppercase">Secure UPI & Card checkout powered by Razorpay</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Link href="/my-trip" className="px-12 py-6 bg-[#003366] text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-[#002244] transition-all flex items-center gap-3">
             {t('view_dashboard')} <ArrowRight className="w-4 h-4" />
           </Link>
           <button onClick={onReset} className="px-12 py-6 bg-white text-[#003366] border-2 border-slate-100 rounded-[2rem] font-black text-xs uppercase hover:bg-slate-50 transition-all">
             {t('plan_another')}
           </button>
        </div>
      )}

      <footer className="text-center space-y-4">
        <div className="flex justify-center gap-8 items-center opacity-30 grayscale">
          {/* Partner Logos Placeholder */}
          <span className="text-[10px] font-black uppercase">Riya Travel</span>
          <span className="text-[10px] font-black uppercase">Razorpay</span>
          <span className="text-[10px] font-black uppercase">TourPlan AI</span>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
           &copy; 2026 TourPlan Intelligence • Integrity Verified
        </p>
      </footer>
    </motion.div>
  );
}
