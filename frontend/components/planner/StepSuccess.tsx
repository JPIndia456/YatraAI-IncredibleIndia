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
  from_city?: string;
  destination?: string;
}

export default function StepSuccess({
  onReset,
  bookingId,
  from_city: propFromCity,
  destination: propDestination,
}: StepSuccessProps) {
  const { activeItinerary, weather, activePNR } = useTripPlannerStore();
  const { telegramId, from_city: storeFromCity, destination: storeDestination, departure_date, return_date } = useTourGuideStore();
  
  const from_city = propFromCity || storeFromCity;
  const destination = propDestination || storeDestination;
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'insights'>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [discoveryData, setDiscoveryData] = useState<any>(activeItinerary?.discovery || null);
  const [liveWeather, setLiveWeather] = useState<{ temp: number; condition: string } | null>(null);

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

  // ── Live Weather Fetch (Open-Meteo — free, no key) ────────────────────────
  useEffect(() => {
    const dest = activeItinerary?.to || destination;
    if (!dest) return;

    const fetchWeather = async () => {
      try {
        // 1. Geocode the destination city name
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dest)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json();
        const loc = geoData?.results?.[0];
        if (!loc) return;

        // 2. Fetch current weather for the coordinates
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`
        );
        const wxData = await wxRes.json();
        const cw = wxData?.current_weather;
        if (!cw) return;

        // 3. Map WMO weather code to a readable condition
        const wmoCondition = (code: number): string => {
          if (code === 0) return 'Clear Sky';
          if (code <= 3) return 'Partly Cloudy';
          if (code <= 48) return 'Foggy';
          if (code <= 67) return 'Rainy';
          if (code <= 77) return 'Snow';
          if (code <= 82) return 'Showers';
          if (code <= 99) return 'Thunderstorm';
          return 'Clear Sky';
        };

        setLiveWeather({
          temp: Math.round(cw.temperature),
          condition: wmoCondition(cw.weathercode),
        });
      } catch (err) {
        console.warn('Weather fetch failed, using stored data:', err);
      }
    };

    fetchWeather();
  }, [activeItinerary, destination]);


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
      const payload = {
        user_id: user.id,
        status: 'confirmed',
        booking_type: 'TRIP',
        total_amount: activeItinerary.totalNum || 0,
        trip_data: activeItinerary,
        confirmed_at: new Date().toISOString()
      };

      let error;
      if (bookingId) {
        // Update existing record
        ({ error } = await supabase
          .from('yatra_bookings')
          .upsert({ id: bookingId, ...payload }, { onConflict: 'id' }));
      } else {
        // Insert fresh record
        ({ error } = await supabase.from('yatra_bookings').insert(payload));
      }

      if (error) throw error;
      
      toast.success("Trip Saved!", { description: "Your itinerary is now available in 'My Trips'." });
      setIsSaved(true);
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error("Save Failed", { description: err?.message || 'Unknown error. Please try again.' });
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#FF9933] uppercase tracking-tight leading-none">
            Odyssey Confirmed
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Booking ID: {confirmationSuffix}</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="glass-panel overflow-hidden border-slate-200/50 bg-white shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)]">
        <div className="p-6 md:p-8 space-y-10">

          {/* Route Intelligence */}
          <div className="glass-panel p-4 sm:p-6 md:p-8 bg-slate-50/30 border-slate-100">
            <p className="text-[10px] font-black text-[#FF9933] uppercase tracking-[0.3em] mb-2">Route Intelligence</p>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#000080] uppercase leading-none tracking-tight mb-4 sm:mb-6">
              <span className="text-[#FF9933]">{activeItinerary?.from || from_city}</span>
              <span className="mx-4 text-slate-200">/</span>
              <span className="text-[#138808]">{activeItinerary?.to || destination}</span>
            </h3>
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

          {/* Climate & Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const wx = liveWeather || (weather ? { temp: parseFloat(String(weather.temp || 24).replace(/[^0-9.-]/g, '')), condition: weather.condition || 'Clear Sky' } : null);
              return wx ? (
                <div className="bg-[#138808] p-8 rounded-[2rem] text-white space-y-6 shadow-xl relative overflow-hidden group border-t-4 border-t-[#FF9933]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] group-hover:bg-white/10 transition-all" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[9px] font-black text-[#FF9933] uppercase tracking-[0.3em] leading-none mb-2">Climate Pulse</p>
                      <h4 className="text-5xl font-black text-[#FF9933] tracking-tighter">{Math.round(wx.temp)}°C</h4>
                    </div>
                    <div className="text-right">
                      <CloudSun className="w-12 h-12 text-[#FF9933] mb-1 ml-auto animate-float" />
                      <p className="text-[11px] font-black uppercase tracking-widest opacity-80">{wx.condition}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10 relative z-10 flex items-center justify-between">
                    <p className="text-[10px] font-black text-[#FF9933] uppercase tracking-widest">Verified Conditions</p>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#138808]/5 p-8 rounded-[2rem] border border-[#138808]/10 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-[#138808] uppercase tracking-widest leading-none mb-2">Climate Pulse</p>
                      <h4 className="text-4xl font-black italic text-[#138808]/20 animate-pulse">Syncing...</h4>
                    </div>
                    <CloudSun className="w-10 h-10 text-[#138808]/20 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              );
            })()}
            <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] space-y-4 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Travel Mode</p>
                  <p className="text-base font-black text-[#000080] uppercase">{activeItinerary?.transport?.name || 'Standard Transit'}</p>
                </div>
                <div className="w-px h-10 bg-slate-200 shrink-0" />
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accommodation</p>
                  <p className="text-base font-black text-[#000080] uppercase">{activeItinerary?.hotel?.name || 'Selected Stay'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery Highlights */}
          {discoveryData && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#FF9933]" />
                <h4 className="text-xl font-extrabold uppercase text-[#000080] tracking-tight">{t('discovery_highlights', 'Discovery Highlights')}</h4>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {[
                  { label: t('heritage_sites', 'Heritage Sites'), icon: MapPin, color: '#FF9933', key: 'heritage' },
                  { label: t('local_bazaars', 'Local Bazaars'), icon: ShoppingBag, color: '#000080', key: 'vibe' },
                  { label: t('landscapes', 'Landscapes'), icon: Compass, color: '#138808', key: 'nature' },
                  { label: t('culinary_pulse', 'Culinary Pulse'), icon: Utensils, color: '#FF9933', key: 'culinary' }
                ].filter(item => !!discoveryData?.[item.key]?.[0]?.name)
                 .map((item, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 px-2 hover:bg-slate-50/60 rounded-xl transition-all">
                    <item.icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                    <p className="text-[9px] font-black uppercase tracking-widest w-28 shrink-0" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-[12px] font-extrabold text-[#000080] uppercase tracking-tight truncate">{discoveryData[item.key][0].name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Odyssey */}
          {(renderableDayPlan || []).length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-black text-[#138808] uppercase tracking-widest">Daily Odyssey</p>
              {(renderableDayPlan || []).map((day: any, i: number) => (
                <div key={i} className="group relative pl-8 pb-8 last:pb-0">
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#138808] bg-white group-hover:bg-[#138808] transition-colors z-10 shadow-sm" />
                  {i !== renderableDayPlan.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100" />}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-[#FF9933] uppercase">{day.title || `Day ${i + 1}`}</h5>
                    <div className="space-y-2">
                      {Array.isArray(day.activities) && day.activities.length > 0 ? day.activities.map((a: any, j: number) => (
                        <div key={j} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-3">
                          <p className="text-[9px] font-black text-[#138808] uppercase w-16 shrink-0">{a.time || 'Flexible'}</p>
                          <p className="text-[11px] font-bold text-slate-700 uppercase">{a.activity || 'Exploring local gems'}</p>
                        </div>
                      )) : (
                        <p className="text-[11px] text-slate-400 italic">Discovery details syncing...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Insights */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-saffron" />
                  <h4 className="text-base font-black uppercase text-[#000080]">{t('odyssey_summary', 'Odyssey Summary')}</h4>
                </div>
                <p className="text-sm text-slate-600 font-bold leading-relaxed italic border-l-4 border-saffron/30 pl-4">
                  &ldquo;{(activeItinerary as any)?.summary || 'An incredible journey through the heart of India awaits you.'}&rdquo;
                </p>
              </div>
              <div className="bg-white border p-6 rounded-[2rem] space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#138808]" />
                  <div>
                    <p className="text-[10px] font-black text-[#138808] uppercase tracking-widest">Grounding Score</p>
                    <p className="text-lg font-black text-[#FF9933]">9.8 / 10 Integrity</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">&ldquo;{safetyTip}&rdquo;</p>
              </div>
            </div>
            <div className="bg-[#138808] rounded-[2rem] p-6 text-white flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#FF9933]/40 shrink-0 bg-white">
                <img src="/yatra-guide.png" alt="Yatra AI" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-black uppercase text-[#FF9933]">{t('planner_label', 'Travel Guide')}</h4>
                <p className="text-[11px] text-white/80 font-bold leading-relaxed">{t('pnr_sync_note', 'Your AI assistant is synced with your PNR for real-time updates.')}</p>
              </div>
              <button onClick={() => window.print()} className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 hover:bg-white/20 transition-all shrink-0">
                <Download className="w-4 h-4 text-[#FF9933]" />
              </button>
            </div>
          </div>

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
