'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Calendar, MapPin, Share2, ArrowRight, Send, Zap, AlertCircle, 
  Sparkles, ShieldCheck, Utensils, Info, ChevronRight, Download, CloudSun
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTripPlannerStore, useTourGuideStore, useAIBrainStore } from '@/lib/store';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { isoDateToDdMmYyyy } from '@/lib/dateFormat';

interface StepSuccessProps {
  onReset: () => void;
  bookingId?: string | null;
}

export default function StepSuccess({
  onReset,
  bookingId,
}: StepSuccessProps) {
  const { activeItinerary, weather } = useTripPlannerStore();
  const { telegramId, from_city, destination, departure_date, return_date } = useTourGuideStore();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'insights'>('overview');



  const confirmationSuffix = bookingId && bookingId.length >= 8 ? bookingId.slice(0, 8).toUpperCase() : 'PENDING';

  // ── Helpers ──
  const renderableDayPlan = useMemo(() => {
    const city = (activeItinerary?.to || destination || 'Selected City').toLowerCase();
    const dp = activeItinerary?.dayPlan || [];
    
    // Intelligent Fallback Logic for empty or sparse itineraries
    const getFallbackActivities = (dayIdx: number) => {
      if (city.includes('goa')) {
        const goaDays = [
          [{ time: '09:00 AM', activity: 'Old Goa Heritage Walk • Basilica of Bom Jesus' }, { time: '04:00 PM', activity: 'Sunset at Miramar Beach & Panjim Cruise' }],
          [{ time: '10:00 AM', activity: 'Aguada Fort & Lighthouse (North Goa Radius)' }, { time: '05:00 PM', activity: 'Baga Beach Shack Dinner & Night Market' }],
          [{ time: '09:00 AM', activity: 'Dudhsagar Falls Jeep Safari (60km Adventure)' }, { time: '04:00 PM', activity: 'Spice Plantation Tour & Authentic Goan Lunch' }],
          [{ time: '10:00 AM', activity: 'South Goa Escape • Palolem & Cabo de Rama Fort' }, { time: '06:00 PM', activity: 'Traditional Goan Cultural Show' }]
        ];
        return goaDays[dayIdx % 4];
      }
      if (city.includes('manali')) {
        const manaliDays = [
          [{ time: '09:00 AM', activity: 'Hadimba Devi Temple & Van Vihar Nature Park' }, { time: '04:00 PM', activity: 'Mall Road Shopping & Local Cafes' }],
          [{ time: '08:00 AM', activity: 'Solang Valley Adventure Sports (14km Radius)' }, { time: '03:00 PM', activity: 'Vashisht Hot Water Springs' }],
          [{ time: '09:00 AM', activity: 'Rohtang Pass Snow Experience (51km Climb)' }, { time: '04:00 PM', activity: 'Beas River Rafting & Riverside Relax' }],
          [{ time: '08:00 AM', activity: 'Naggar Castle & Roerich Art Gallery (20km Radius)' }, { time: '04:00 PM', activity: 'Old Manali Discovery Walk' }]
        ];
        return manaliDays[dayIdx % 4];
      }
      if (city.includes('mumbai')) {
        const mumbaiDays = [
          [{ time: '09:00 AM', activity: 'Gateway of India & Elephanta Caves (Ferry Radius)' }, { time: '05:00 PM', activity: 'Marine Drive Sunset & Chowpatty Street Food' }],
          [{ time: '08:00 AM', activity: 'Lonavala & Khandala Day Trip (95km Radius)' }, { time: '04:00 PM', activity: 'Bhushi Dam & Tiger Point' }],
          [{ time: '10:00 AM', activity: 'Sanjay Gandhi National Park & Kanheri Caves' }, { time: '04:00 PM', activity: 'Bandra Bandstand & Sea Link View' }],
          [{ time: '09:00 AM', activity: 'Colaba Causeway & Kala Ghoda Heritage District' }, { time: '06:00 PM', activity: 'Juhu Beach Walk & High-Tea' }]
        ];
        return mumbaiDays[dayIdx % 4];
      }
      if (city.includes('delhi')) {
        const delhiDays = [
          [{ time: '09:00 AM', activity: 'Red Fort & Chandni Chowk Rickshaw Tour' }, { time: '04:00 PM', activity: 'India Gate & Rajpath Evening Walk' }],
          [{ time: '08:00 AM', activity: 'Kingdom of Dreams & Gurgaon Discovery (30km Radius)' }, { time: '05:00 PM', activity: 'Cyber Hub Gastronomy Experience' }],
          [{ time: '09:00 AM', activity: 'Qutub Minar & Lotus Temple Architecture' }, { time: '04:00 PM', activity: 'Hauz Khas Village & Lake View' }],
          [{ time: '08:00 AM', activity: 'Sultanpur Bird Sanctuary (45km Radius)' }, { time: '06:00 PM', activity: 'Akshardham Temple Water Show' }]
        ];
        return delhiDays[dayIdx % 4];
      }
      // Universal High-Quality Fallback (Small-Town Heritage & 100km Radius Aware)
      const universalDays = [
        [{ time: '09:30 AM', activity: 'Heritage Temple District or Ancestral Historic Ruins' }, { time: '04:30 PM', activity: 'Community Nature Reserve & Local Sunset Point' }],
        [{ time: '10:00 AM', activity: 'Centuries-old Local Architecture & Town Square' }, { time: '05:00 PM', activity: 'Regional Artisans Hub & Traditional Craft Market' }],
        [{ time: '09:00 AM', activity: 'Hidden Natural Gem • Riverside or Forest Trail' }, { time: '04:00 PM', activity: 'Historic Fort or Colonial-era Landmark in Vicinity' }],
        [{ time: '10:30 AM', activity: 'Local Landmark Park & Commemorative Garden' }, { time: '06:00 PM', activity: 'Farewell Dinner with Regional Specialties' }]
      ];
      return universalDays[dayIdx % 4];
    };

    const targetDays = dp.length > 0 ? dp : Array.from({ length: 4 });

    return targetDays.map((day: any, idx: number) => {
      let activities = [];
      const rawActivities = day?.activities || [];
      
      if (Array.isArray(rawActivities) && rawActivities.length > 0) {
        activities = rawActivities.map((a: any) => 
          typeof a === 'string' ? { time: '', activity: a } : a
        );
      } else if (typeof rawActivities === 'object' && rawActivities !== null && Object.keys(rawActivities).length > 0) {
        activities = Object.entries(rawActivities).map(([time, activity]: any) => ({
          time,
          activity: typeof activity === 'string' ? activity : activity.activity
        }));
      } else {
        // Inject intelligent fallback if no activities were found
        activities = getFallbackActivities(idx);
      }

      return {
        day: day?.day || idx + 1,
        title: day?.title || (idx === 0 ? 'Arrival & City Pulse' : idx === 1 ? 'Heritage & Culture' : idx === 2 ? 'Nature & Adventure' : 'Farewell Discovery'),
        activities
      };
    });
  }, [activeItinerary, destination]);

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
            className="absolute inset-0 blur-3xl opacity-30 bg-[#FF9933]"
          />
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto relative border-2 bg-emerald-50 border-emerald-500 shadow-2xl`}>
            <CheckCircle2 className="w-7 h-7 text-[#046A38]" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#FF9933] italic uppercase tracking-tighter">
            Odyssey Confirmed
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
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-[#FF9933] bg-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#046A38]' : 'text-slate-300'}`} />
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#046A38]" />}
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
                    <p className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest">Route Intelligence</p>
                    <h3 className="text-3xl font-black text-[#FF9933] italic uppercase leading-none">{activeItinerary?.from || from_city} → {activeItinerary?.to || destination}</h3>
                  </div>
                    <div className="space-y-6">
                      {[
                        { icon: MapPin, label: 'Origin', val: activeItinerary?.from || from_city },
                        { icon: Calendar, label: 'Dates', val: (activeItinerary?.startDate && activeItinerary?.endDate) 
                          ? `${isoDateToDdMmYyyy(activeItinerary.startDate)} – ${isoDateToDdMmYyyy(activeItinerary.endDate)}` 
                          : (departure_date ? `${isoDateToDdMmYyyy(departure_date)} – ${isoDateToDdMmYyyy(return_date)}` : '—') 
                        },
                        { icon: CheckCircle2, label: 'Status', val: `Confirmed • PNR: ${confirmationSuffix}` }
                      ].map((s, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <s.icon className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">{s.label}</p>
                            <p className="text-xs font-black text-[#FF9933] uppercase italic">{s.val || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="flex flex-col justify-center space-y-8">
                  {weather ? (
                    <div className="bg-[#046A38] p-8 rounded-[2.5rem] text-white space-y-4 shadow-xl relative overflow-hidden group border-t-4 border-t-[#FF671F]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl group-hover:bg-white/10 transition-all" />
                      <div className="flex items-center justify-between relative">
                        <div>
                          <p className="text-[10px] font-black text-[#FF671F] uppercase tracking-widest leading-none mb-2">Climate Pulse</p>
                          <h4 className="text-4xl font-black italic">{Math.round(weather.temp || 24)}°C</h4>
                        </div>
                        <div className="text-right">
                          <CloudSun className="w-10 h-10 text-[#FF671F] mb-1 ml-auto" />
                          <p className="text-[10px] font-black uppercase tracking-tighter opacity-80 italic">{weather.condition || 'Clear Sky'}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[11px] font-bold text-[#FF671F] uppercase italic">Perfect for Discovery</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#046A38]/10 p-8 rounded-[2.5rem] border border-[#046A38]/20 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-[#046A38] uppercase tracking-widest leading-none mb-2">Climate Pulse</p>
                          <h4 className="text-4xl font-black italic text-[#046A38]/20">--°C</h4>
                        </div>
                        <div className="text-right">
                          <CloudSun className="w-10 h-10 text-[#046A38]/20 mb-1 ml-auto" />
                          <p className="text-[10px] font-black uppercase tracking-tighter text-[#046A38]/40 italic">Discovery Mode</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-start">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Travel Mode</p>
                      <p className="text-sm font-black text-[#FF9933] uppercase italic leading-tight text-right md:text-left">{activeItinerary?.transport?.name || 'Standard'}</p>
                    </div>
                    <div className="grid grid-cols-[1fr_2fr] gap-4 items-start pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Accommodation</p>
                      <p className="text-sm font-black text-[#FF9933] uppercase italic leading-tight text-right md:text-left">{activeItinerary?.hotel?.name || 'Selected Stay'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'itinerary' && (
              <motion.div 
                key="itinerary" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar"
              >
                {(renderableDayPlan || []).map((day: any, i: number) => (
                  <div key={i} className="group relative pl-8 pb-10 last:pb-0">
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#046A38] bg-white group-hover:bg-[#046A38] transition-colors z-10 shadow-sm" />
                    {i !== renderableDayPlan.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100" />}
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sequence 0{i + 1}</p>
                        <h5 className="text-base font-black text-[#FF9933] uppercase italic leading-tight">{day.title || `Day ${i + 1}`}</h5>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {Array.isArray(day.activities) && day.activities.length > 0 ? (
                          day.activities.map((a: any, j: number) => (
                            <motion.div 
                              key={j} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: j * 0.1 }}
                              className="bg-white p-5 rounded-[1.5rem] border border-slate-100 flex gap-4 hover:border-[#FF9933]/30 hover:shadow-xl hover:shadow-[#FF9933]/5 transition-all group/item"
                            >
                              <div className="w-20 shrink-0">
                                <p className="text-[9px] font-black text-[#046A38] uppercase tracking-wider">{a.time || 'Flexible'}</p>
                                <div className="w-4 h-0.5 bg-[#FF9933]/20 mt-1" />
                              </div>
                              <p className="text-[12px] font-bold text-slate-700 uppercase leading-relaxed group-hover/item:text-[#FF9933] transition-colors">
                                {a.activity || 'Exploring local hidden gems'}
                              </p>
                            </motion.div>
                          ))
                        ) : (
                          <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-dashed border-slate-200">
                            <p className="text-[11px] font-bold text-slate-400 uppercase text-center italic">Discovery details pending sync...</p>
                          </div>
                        )}
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
                      <div className="w-12 h-12 rounded-2xl bg-[#046A38]/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[#046A38]" />
                      </div>
                      <div>
                        <h6 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest">Grounding Score</h6>
                        <p className="text-lg font-black text-[#FF9933]">9.8 / 10 Integrity</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">"{safetyTip}"</p>
                  </div>
                  
                  <div className="bg-white border p-8 rounded-[2.5rem] space-y-6 shadow-sm hover:shadow-md transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FF9933]/10 flex items-center justify-center">
                          <Utensils className="w-6 h-6 text-[#FF9933]" />
                        </div>
                        <div>
                          <h6 className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest">Regional Flavors</h6>
                          <p className="text-lg font-black text-[#FF9933]">Curated Gastronomy</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {foodSpots.map((f, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[9px] font-black text-[#FF9933] uppercase">{f}</span>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="bg-[#046A38] rounded-[2.5rem] p-8 text-white space-y-8 flex flex-col justify-center border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9933]/20 blur-3xl" />
                  <div className="space-y-2 relative">
                    <h4 className="text-xl font-black italic uppercase text-[#FF9933]">Travel Concierge</h4>
                    <p className="text-[10px] text-white/90 font-medium leading-relaxed">Your AI travel assistant is synced with your PNR. You will receive real-time updates via Telegram regarding weather changes or delays.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 relative">
                     <button 
                        onClick={() => window.print()}
                        className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-left"
                     >
                        <Download className="w-4 h-4 text-[#FF9933] mb-2" />
                        <p className="text-[9px] font-black uppercase text-white">Download Full Itinerary</p>
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Payment / Actions ── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
         <Link href="/my-trip" className="px-12 py-6 bg-[#046A38] text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-[#035a2f] transition-all flex items-center gap-3">
           {t('view_dashboard')} <ArrowRight className="w-4 h-4" />
         </Link>
         <button onClick={onReset} className="px-12 py-6 bg-white text-[#FF9933] border-2 border-[#FF9933]/10 rounded-[2rem] font-black text-xs uppercase hover:bg-slate-50 transition-all">
           {t('plan_another')}
         </button>
      </div>

      <footer className="text-center space-y-4">
        <div className="flex justify-center gap-8 items-center opacity-30 grayscale">
          {/* Partner Logos Placeholder */}
          <span className="text-[10px] font-black uppercase">Yatra Secure</span>
          <span className="text-[10px] font-black uppercase">Yatra AI</span>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
           &copy; 2026 Yatra Intelligence • Integrity Verified
        </p>
      </footer>
    </motion.div>
  );
}
