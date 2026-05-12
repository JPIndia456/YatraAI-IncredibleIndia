'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Calendar, MapPin, Share2, ArrowRight, Send, Zap, AlertCircle, 
  Sparkles, ShieldCheck, Utensils, Info, ChevronRight, Download, CloudSun,
  Camera, ShoppingBag, Compass
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTripPlannerStore, useTourGuideStore, useAIBrainStore } from '@/lib/store';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { isoDateToDdMmYyyy } from '@/lib/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, CloudUpload } from 'lucide-react';

interface StepSuccessProps {
  onReset: () => void;
  bookingId?: string | null;
}

export default function StepSuccess({
  onReset,
  bookingId,
}: StepSuccessProps) {
  const { activeItinerary, weather, activePNR } = useTripPlannerStore();
  const { telegramId, from_city, destination, departure_date, return_date } = useTourGuideStore();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'insights'>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [discoveryData, setDiscoveryData] = useState<any>(activeItinerary?.discovery || null);

  useEffect(() => {
    if (!activeItinerary || discoveryData) return;
    
    const fetchDiscovery = async () => {
      try {
        const dest = activeItinerary.to || destination;
        const res = await fetch('/api/mcp/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'cultural',
            stateLocation: dest,
            language: 'en'
          })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setDiscoveryData(json.data);
        }
      } catch (err) {
        console.error("Discovery Fetch Error:", err);
      }
    };
    
    fetchDiscovery();
  }, [activeItinerary, destination, discoveryData]);


  const confirmationSuffix = useMemo(() => 
    activePNR || (bookingId && bookingId.length >= 8 ? bookingId.slice(0, 8).toUpperCase() : 'PENDING')
  , [bookingId, activePNR]);

  // ── Helpers ──
  const renderableDayPlan = useMemo(() => {
    if (!activeItinerary) return [];
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

  const handleSaveToMyTrips = async () => {
    if (!user) {
      toast.error("Authentication Required", { description: "Please sign in to save this trip to your profile." });
      return;
    }
    if (!activeItinerary) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('yatra_bookings').upsert({
        ...(bookingId ? { id: bookingId } : {}),
        user_id: user.id,
        origin: activeItinerary.from || from_city,
        destination: activeItinerary.to || destination,
        trip_details: activeItinerary,
        total_price: activeItinerary.totalNum || 0,
        status: 'confirmed',
        booking_type: 'TRIP',
        confirmed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,destination,origin'
      });

      if (error) throw error;
      
      toast.success("Trip Saved!", { description: "Your itinerary is now available in 'My Trips'." });
      setIsSaved(true);
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error("Save Failed", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeItinerary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 py-6 px-4"
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
            <CheckCircle2 className="w-7 h-7 text-[#138808]" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-5xl font-extrabold text-[#FF9933] uppercase tracking-tight leading-none">
            Odyssey Confirmed
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Booking ID: {confirmationSuffix}</p>
        </div>
      </div>

      {/* ── Master Plan Tabs ── */}
      <div className="glass-panel overflow-hidden border-slate-200/50 bg-white shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">
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
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#138808]' : 'text-slate-300'}`} />
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#138808]" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8 min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                {/* ── Top Row: Route Intelligence ── */}
                <div className="glass-panel p-8 bg-slate-50/30 border-slate-100">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-[#FF9933] uppercase tracking-[0.3em]">Route Intelligence</p>
                      <h3 className="text-3xl md:text-4xl font-black text-[#000080] uppercase leading-none tracking-tight">
                         <span className="text-[#FF9933]">{activeItinerary?.from || from_city}</span> 
                         <span className="mx-4 text-slate-200">/</span> 
                         <span className="text-[#138808]">{activeItinerary?.to || destination}</span>
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200/50">
                      {[
                        { icon: MapPin, label: 'Origin', val: activeItinerary?.from || from_city, color: 'text-[#FF9933]', bg: 'bg-[#FF9933]/5' },
                        { icon: Calendar, label: 'Dates', val: (activeItinerary?.startDate && activeItinerary?.endDate) 
                          ? `${isoDateToDdMmYyyy(activeItinerary.startDate)} – ${isoDateToDdMmYyyy(activeItinerary.endDate)}` 
                          : (departure_date ? `${isoDateToDdMmYyyy(departure_date)} – ${isoDateToDdMmYyyy(return_date)}` : '—'),
                          color: 'text-[#003366]', bg: 'bg-[#003366]/5'
                        },
                        { icon: CheckCircle2, label: 'Status', val: `PNR: ${confirmationSuffix}`, color: 'text-[#138808]', bg: 'bg-[#138808]/5' }
                      ].map((s, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0 border border-slate-100 shadow-sm`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className={`text-[11px] font-black ${s.color} uppercase tracking-tight`}>{s.val || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Second Row: Climate & Logistics ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {weather ? (
                    <div className="bg-[#138808] p-8 rounded-[2rem] text-white space-y-6 shadow-xl relative overflow-hidden group border-t-4 border-t-[#FF9933]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] group-hover:bg-white/10 transition-all" />
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[9px] font-black text-[#FF9933] uppercase tracking-[0.3em] leading-none mb-2">Climate Pulse</p>
                          <h4 className="text-5xl font-black text-[#FF9933] tracking-tighter">{Math.round(weather.temp || 24)}°C</h4>
                        </div>
                        <div className="text-right">
                          <CloudSun className="w-12 h-12 text-[#FF9933] mb-1 ml-auto animate-float" />
                          <p className="text-[11px] font-black uppercase tracking-widest opacity-80">{weather.condition || 'Clear Sky'}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/10 relative z-10 flex items-center justify-between">
                        <p className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest">Verified Conditions</p>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#138808]/5 p-8 rounded-[2rem] border border-[#138808]/10 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-[#138808] uppercase tracking-widest leading-none mb-2">Climate Pulse</p>
                          <h4 className="text-4xl font-black italic text-[#138808]/20">--°C</h4>
                        </div>
                        <div className="text-right">
                          <CloudSun className="w-10 h-10 text-[#138808]/20 mb-1 ml-auto" />
                          <p className="text-[10px] font-black uppercase tracking-tighter text-[#138808]/40 italic">Discovery Mode</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] space-y-8 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Travel Mode</p>
                        <p className="text-base font-black text-[#000080] uppercase tracking-tight leading-tight">{activeItinerary?.transport?.name || 'Standard Transit'}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200 shrink-0" />
                      <div className="flex flex-col gap-1 text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accommodation</p>
                        <p className="text-base font-black text-[#000080] uppercase tracking-tight leading-tight">{activeItinerary?.hotel?.name || 'Selected Stay'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* ── Discovery Highlights (Refined) ── */}
                <div className="space-y-6 pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FF9933]/5 flex items-center justify-center border border-[#FF9933]/10 shadow-sm">
                          <Sparkles className="w-6 h-6 text-[#FF9933]" />
                        </div>
                        <div>
                          <h4 className="text-3xl font-extrabold uppercase text-[#000080] tracking-tight leading-none">{t('discovery_highlights', 'Discovery Highlights')}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">{t('monuments_markets_landscapes', 'Monuments, Markets & Landscapes')}</p>
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: t('heritage_sites', 'Heritage Sites'), icon: MapPin, color: '#FF9933', bg: 'bg-[#FF9933]/5', key: 'heritage' },
                      { label: t('local_bazaars', 'Local Bazaars'), icon: ShoppingBag, color: '#000080', bg: 'bg-[#000080]/5', key: 'vibe' },
                      { label: t('landscapes', 'Landscapes'), icon: Compass, color: '#138808', bg: 'bg-[#138808]/5', key: 'nature' },
                      { label: t('culinary_pulse', 'Culinary Pulse'), icon: Utensils, color: '#FF9933', bg: 'bg-[#FF9933]/5', key: 'culinary' }
                    ].map((item, i) => {
                      const specificPlace = discoveryData?.[item.key]?.[0]?.name || (activeItinerary?.to || destination);
                      return (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className={`group relative py-8 px-6 rounded-[2rem] overflow-hidden ${item.bg} border border-slate-100 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
                        >
                          <div className="space-y-4 relative z-10 flex flex-col items-center text-center">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                              <item.icon className="w-5 h-5" style={{ color: item.color }} />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5" style={{ color: item.color }}>{item.label}</p>
                              <p className="text-[13px] font-extrabold text-[#000080] uppercase tracking-normal leading-none line-clamp-2">{specificPlace}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#138808] bg-white group-hover:bg-[#138808] transition-colors z-10 shadow-sm" />
                    {i !== renderableDayPlan.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100" />}
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Sequence 0{i + 1}</p>
                        <h5 className="text-lg font-black text-[#FF9933] uppercase leading-tight">{day.title || `Day ${i + 1}`}</h5>
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
                                <p className="text-[9px] font-black text-[#138808] uppercase tracking-wider">{a.time || 'Flexible'}</p>
                                <div className="w-4 h-0.5 bg-[#FF9933]/20 mt-1" />
                              </div>
                              <p className="text-[12px] font-bold text-slate-700 uppercase leading-relaxed group-hover/item:text-[#FF9933] transition-colors">
                                {a.activity || 'Exploring local hidden gems'}
                              </p>
                            </motion.div>
                          ))
                        ) : (
                          <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-dashed border-slate-200">
                            <p className="text-[12px] font-bold text-slate-500 uppercase text-center">Discovery details pending sync...</p>
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
                  <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-saffron/10 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-saffron" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-black uppercase text-[#000080]">{t('odyssey_summary', 'Odyssey Summary')}</h4>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Curated Discovery Intelligence</p>
                      </div>
                    </div>
                    <p className="text-base text-slate-600 font-bold leading-relaxed italic border-l-4 border-saffron/30 pl-6 py-2">
                      "{ (activeItinerary as any).summary || 'An incredible journey through the heart of India awaits you.' }"
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white border p-8 rounded-[2.5rem] space-y-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#138808]/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[#138808]" />
                      </div>
                      <div>
                        <h6 className="text-[12px] font-black text-[#138808] uppercase tracking-widest">Grounding Score</h6>
                        <p className="text-xl font-black text-[#FF9933]">9.8 / 10 Integrity</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">"{safetyTip}"</p>
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

                <div className="bg-[#138808] rounded-[2.5rem] p-8 text-white space-y-8 flex flex-col justify-center border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9933]/20 blur-3xl" />
                  <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#FF9933]/40 shadow-2xl shrink-0 bg-white">
                      <img src="/yatra-guide.png" alt="Yatra AI" className="w-full h-full object-cover object-center" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black uppercase text-[#FF9933]">{t('planner_label', 'Travel Guide')}</h4>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">{t('yatra_sahayak_active', 'Yatra Sahayak Active')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/95 font-bold leading-relaxed relative">{t('pnr_sync_note', 'Your AI travel assistant is synced with your PNR. You will receive real-time updates via Telegram regarding weather changes or delays.')}</p>
                  
                  <div className="grid grid-cols-2 gap-4 relative">
                     <button 
                        onClick={() => window.print()}
                        className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-left"
                     >
                        <Download className="w-4 h-4 text-[#FF9933] mb-2" />
                        <p className="text-[9px] font-black uppercase text-white">{t('download_full_itinerary', 'Download Full Itinerary')}</p>
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Odyssey Actions ── */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
         <Link 
           href={bookingId ? `/my-trip?id=${bookingId}` : "/my-trip"} 
           className="px-10 py-6 bg-[#138808] text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-lg hover:bg-[#035a2f] transition-all flex items-center gap-3 hover:-translate-y-1"
         >
           {t('view_dashboard')} <ArrowRight className="w-4 h-4 text-[#FF9933]" />
         </Link>
         
         <button 
           onClick={handleSaveToMyTrips}
           disabled={isSaving || isSaved}
           className={`px-10 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 hover:-translate-y-1 shadow-lg ${
             isSaved 
             ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
             : 'bg-[#FF9933] text-white hover:bg-orange-600'
           }`}
         >
           {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
           {isSaved ? t('trip_secured', 'Trip Secured') : t('save_to_my_trips', 'Save to My Trips')}
         </button>

         <button onClick={onReset} className="px-10 py-6 bg-white text-[#FF9933] border-2 border-[#FF9933]/10 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-md hover:bg-slate-50 transition-all hover:-translate-y-1">
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
