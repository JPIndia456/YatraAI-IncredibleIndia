'use client';

import { useTripPlannerStore, useTripStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Clock, 
  Hotel, Plane, Sparkles, 
  Download, Share2, ShieldCheck, Globe, Train, X, Utensils,
  CloudUpload, CheckCircle2, Loader2, AlertCircle,
  Car, Map, Phone, Wallet, Plus, Home, Compass, User,
  ChevronRight, ArrowRight, PlaneTakeoff, Info, Star,
  Compass as CompassIcon, Heart, Shield
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { isoToDdMonthYy } from '@/lib/dateFormat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

/** Align with TripPlanner — AI JSON varies (array / keyed object / string). */
function normalizeDayActivities(activities: unknown): Array<{ time: string; activity: string }> {
  if (Array.isArray(activities)) {
    return activities
      .map((a: any) => ({
        time: String(a?.time || 'All day'),
        activity: String(a?.activity || '').trim(),
      }))
      .filter((a) => a.activity.length > 0);
  }
  if (typeof activities === 'object' && activities !== null) {
    return Object.entries(activities as Record<string, unknown>)
      .map(([k, v]: [string, unknown]) => ({
        time: String(k || 'All day'),
        activity:
          typeof v === 'string'
            ? v.trim()
            : String((v as { activity?: string })?.activity || '').trim(),
      }))
      .filter((a) => a.activity.length > 0);
  }
  if (typeof activities === 'string') {
    const txt = activities.trim();
    return txt ? [{ time: 'All day', activity: txt }] : [];
  }
  return [];
}

/**
 * Prefer dayPlan; fallback itinerary; pad days missing activities so the UI isn't blank.
 */
function deriveJourneyDays(plan: Record<string, any> | null | undefined) {
  if (!plan) return [];
  const city = (plan.destination || plan.to || 'Selected City').toLowerCase();
  const raw = plan.dayPlan ?? plan.itinerary;
  
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
    const universalDays = [
      [{ time: '09:30 AM', activity: 'Heritage Temple District or Ancestral Historic Ruins' }, { time: '04:30 PM', activity: 'Community Nature Reserve & Local Sunset Point' }],
      [{ time: '10:00 AM', activity: 'Centuries-old Local Architecture & Town Square' }, { time: '05:00 PM', activity: 'Regional Artisans Hub & Traditional Craft Market' }],
      [{ time: '09:00 AM', activity: 'Hidden Natural Gem • Riverside or Forest Trail' }, { time: '04:00 PM', activity: 'Historic Fort or Colonial-era Landmark in Vicinity' }],
      [{ time: '10:30 AM', activity: 'Local Landmark Park & Commemorative Garden' }, { time: '06:00 PM', activity: 'Farewell Dinner with Regional Specialties' }]
    ];
    return universalDays[dayIdx % 4];
  };

  const targetDays = Array.isArray(raw) && raw.length > 0 ? raw : Array.from({ length: 4 });

  return targetDays.map((day: any, idx: number) => {
    let activities = normalizeDayActivities(day?.activities);
    const title = String(day?.title || '').trim() || city.charAt(0).toUpperCase() + city.slice(1);
    
    if (activities.length === 0) {
      activities = getFallbackActivities(idx);
    }

    const rawDay = day?.day;
    let dayLabel = '';
    if (typeof rawDay === 'string' && rawDay.trim() && isNaN(Number(rawDay))) {
      dayLabel = rawDay.trim();
    }

    return {
      day: dayLabel,
      title,
      date: typeof day?.date === 'string' ? day.date : undefined,
      activities,
    };
  });
}

export default function MyTripPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyTripContent />
    </Suspense>
  );
}

function MyTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get('id');
  const { user } = useAuth();
  const { activeItinerary: plan } = useTripPlannerStore();
  const { startDate, endDate, origin, adults, kids } = useTripStore();
  const [mounted, setMounted] = useState(false);
  const [dbTrip, setDbTrip] = useState<any | null>(null);
  const [loadingDbTrip, setLoadingDbTrip] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedSync = localStorage.getItem(`yatra_sync_${plan?.destination}`);
    if (storedSync) setLastSynced(storedSync);
  }, [plan?.destination]);

  useEffect(() => {
    if (!user?.id) return;
    // If we have a specific tripId, we load it even if there is a plan in store
    // because the user explicitly clicked on a discovery in their profile.
    
    const loadSpecificTrip = async () => {
      setLoadingDbTrip(true);
      try {
        let query = supabase
          .from('yatra_bookings')
          .select('id, origin, destination, status, pnr, confirmed_at, created_at, total_price, trip_details');
          
        if (tripId) {
          query = query.eq('id', tripId);
        } else {
          query = query.eq('user_id', user.id)
            .in('status', ['pending_payment', 'paid', 'pending_provider', 'confirmed'])
            .order('created_at', { ascending: false })
            .limit(1);
        }

        let { data, error } = await query.maybeSingle();

        if (error) throw error;

        // Fallback: Check saved trip plans if no active booking is found
        if (!data) {
          const { data: planData, error: planError } = await supabase
            .from('yatra_trip_plans')
            .select('id, origin, destination, status, created_at, total_price, trip_details')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!planError && planData) {
            data = planData as any;
          }
        }

        if (!data) return;

        const tripData = data.trip_details as any;
        const details = tripData?.details || {};

        setDbTrip({
          ...tripData,
          id: data.id,
          totalEstimate: tripData.totalEstimate || (data.total_price ? `₹${Number(data.total_price).toLocaleString('en-IN')}` : '₹0'),
          passengers: tripData.passengers || details.passengers || [],
          total_price: details?.total || 0,
          pnr: details?.pnr || data.pnr || null,
          is_tatkal: details?.isTatkal || false,
          bookingStatus: data.status || tripData.bookingStatus || 'confirmed',
        });
      } catch (err) {
        console.error('Load My Trips Error:', err);
      } finally {
        setLoadingDbTrip(false);
      }
    };

    loadSpecificTrip();
  }, [user?.id, tripId]);

  const effectivePlan = plan || dbTrip;
  const journeyDays = deriveJourneyDays(effectivePlan as Record<string, unknown>);

  const handleSyncToCloud = async () => {
    if (!user) {
      toast.error("Auth Required", { description: "Sign in to backup your trip." });
      return;
    }
    if (!effectivePlan) return;

    setSyncing(true);
    try {
      const { error } = await supabase.from('yatra_bookings').upsert({
        ...(effectivePlan.id ? { id: effectivePlan.id } : {}),
        user_id: user.id,
        origin: effectivePlan.from,
        destination: effectivePlan.destination,
        trip_details: effectivePlan,
        total_price: typeof effectivePlan.totalNum === 'number' ? effectivePlan.totalNum : 0,
        status: 'confirmed',
        booking_type: 'TRIP',
        confirmed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,destination,origin'
      });

      if (error) throw error;
      
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem(`yatra_sync_${effectivePlan.destination}`, now);
      toast.success("Sync Complete", { description: "Your itinerary is safely backed up." });
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast.error("Sync Failed", { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted) return null;

  if (!effectivePlan) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6 text-center text-[#000080]">
        <Sparkles className={`text-saffron/20 mb-6 ${loadingDbTrip ? 'animate-pulse' : ''}`} size={60} />
        <h1 className="text-xl font-black mb-2 uppercase tracking-widest text-saffron">
          {loadingDbTrip ? 'Loading My Trips' : 'No Active Discovery'}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {loadingDbTrip ? 'Fetching your latest confirmed booking...' : 'Your curated travel plans will appear here after selection.'}
        </p>
        <button 
          onClick={() => router.push('/planner')}
          className="px-8 py-3 bg-saffron text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-saffron/20"
        >
          Return to Planner
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => (
    <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
      status === 'Confirmed' ? 'bg-green/10 border-green/20 text-green' : 'bg-saffron/10 border-saffron/20 text-saffron'
    }`}>
      {status}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#000080] font-sans antialiased selection:bg-saffron/30">
      
      {/* ── 1. STICKY HEADER ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] bg-[#FDFDFB]/90 backdrop-blur-3xl border-b border-orange-100 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron to-yellow-600 flex items-center justify-center shadow-lg shadow-saffron/20 cursor-pointer" onClick={() => router.push('/')}>
            <PlaneTakeoff className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic leading-none">YA<span className="text-saffron">TRA</span></h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Discovery Secured • 2026</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-all text-saffron">
            <Share2 size={18} />
          </button>
          <button onClick={handleSyncToCloud} disabled={syncing} className="p-2.5 rounded-xl bg-saffron text-white hover:bg-orange-600 transition-all shadow-lg shadow-saffron/10">
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8 space-y-12 pb-32">
        
        {/* ── 2. HERO SUMMARY ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-[2.5rem] p-8 overflow-hidden border border-orange-100 shadow-xl bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-saffron/5 via-transparent to-green/5" />
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
               <div>
                 <div className="text-[10px] font-black text-saffron uppercase tracking-[0.2em] mb-2">Selected Adventure</div>
                 <h2 className="text-3xl font-black tracking-tight leading-none uppercase italic text-[#000080]">{effectivePlan.destination}</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Via {origin || 'Direct Access'}</p>
               </div>
               {getStatusBadge('Confirmed')}
            </div>

            <div className="flex gap-4">
               <button
                 onClick={() => {
                   if (dbTrip) {
                     useTripPlannerStore.getState().setActiveItinerary(dbTrip);
                     toast.success("Odyssey Loaded", { description: "You can now edit this plan in the studio." });
                     router.push('/planner');
                   }
                 }}
                 className="flex-1 py-3 bg-[#FF9933]/10 text-saffron border border-saffron/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-saffron hover:text-white transition-all flex items-center justify-center gap-2"
               >
                 <Sparkles className="w-4 h-4" /> Resume Odyssey
               </button>
               <button className="flex-1 py-3 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                 Archive Plan
               </button>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={10} className="text-saffron" /> Date Range
                  </p>
                  <p className="text-sm font-black text-[#000080]">
                    {isoToDdMonthYy(effectivePlan.startDate || startDate)} – {isoToDdMonthYy(effectivePlan.endDate || endDate)}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={10} className="text-saffron" /> Travelers
                  </p>
                  <p className="text-sm font-black text-[#000080]">{adults}A, {kids}K • {effectivePlan.duration}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BadgeIndianRupee size={10} className="text-saffron" /> Total Cost
                  </p>
                  <p className="text-2xl font-black text-blue-700 tracking-tighter italic leading-none">{effectivePlan.totalEstimate}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={10} className="text-saffron" /> Safety
                  </p>
                  <p className="text-sm font-black text-blue-700">Score: {effectivePlan.safety?.score || '9.2'}/10</p>
               </div>
            </div>

            {(effectivePlan.passengers?.length || 0) > 0 && (
              <div className="pt-4 border-t border-orange-100 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Traveler Manifest</p>
                <div className="space-y-1.5">
                  {(effectivePlan.passengers || []).map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold">{p.name || 'Traveler'}</span>
                      <span className="text-slate-400 uppercase">{p.type || 'adult'}{p.age ? ` · ${p.age}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── 3. CHRONOLOGICAL TIMELINE (LOGISTICS) ───────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">Logistics & Transfers</h3>
             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Real-time Data</span>
          </div>

          <div className="relative pl-12 space-y-6">
            <div className="absolute left-6 top-4 bottom-4 w-[1px] bg-orange-100" />

            {/* Selected Transport */}
            {effectivePlan.transport && (
              <div className="relative group">
                <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-saffron z-10 border border-[#FDFDFB] group-hover:scale-150 transition-transform" />
                <div className="p-5 bg-white border border-orange-100 rounded-3xl space-y-4 shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                           {(effectivePlan.transport.mode?.toLowerCase() || '').includes('flight') ? <Plane size={18} className="text-saffron" /> : <Train size={18} className="text-saffron" />}
                        </div>
                        <div>
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{effectivePlan.transport.mode || 'Transport'}</p>
                           <p className="text-sm font-black text-[#000080]">{effectivePlan.transport.from || 'Origin'} → {effectivePlan.transport.to || effectivePlan.destination}</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-blue-700">
                       {effectivePlan.transport.price?.replace(/,$/, '').startsWith('₹') 
                         ? effectivePlan.transport.price.replace(/,$/, '') 
                         : `₹${effectivePlan.transport.price?.replace(/,$/, '') || '0'}`}
                     </p>
                   </div>
                   <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      <span>Duration: {effectivePlan.transport.duration || 'N/A'}</span>
                      <span className="text-saffron">{effectivePlan.transport.detail || 'Confirmed Selection'}</span>
                   </div>
                </div>
              </div>
            )}

            {/* Selected Hotel */}
            {effectivePlan.hotel && (
              <div className="relative group">
                <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-green z-10 border border-[#FDFDFB] group-hover:scale-150 transition-transform" />
                <div className="p-5 bg-white border border-orange-100 rounded-3xl space-y-4 shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green/10 flex items-center justify-center border border-green/20">
                           <Hotel size={18} className="text-green" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Accommodation</p>
                           <p className="text-sm font-black text-[#000080] truncate">{effectivePlan.hotel.name}</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-blue-700">
                       {effectivePlan.hotel.price?.replace(/,$/, '').startsWith('₹') 
                         ? effectivePlan.hotel.price.replace(/,$/, '') 
                         : `₹${effectivePlan.hotel.price?.replace(/,$/, '') || '0'}`}
                     </p>
                   </div>
                   <div className="flex items-center gap-2">
                      <Star size={10} className="text-saffron fill-saffron" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {effectivePlan.hotel.rating} Rating • {effectivePlan.hotel.tier || 'Selected Stay'}
                      </span>
                   </div>
                </div>
              </div>
            )}

            {/* Selected Local Transport */}
            {effectivePlan.local && (
              <div className="relative group">
                <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-blue-500 z-10 border border-[#FDFDFB] group-hover:scale-150 transition-transform" />
                <div className="p-5 bg-white border border-orange-100 rounded-3xl space-y-4 shadow-sm">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                           <Car size={18} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Local Transfers</p>
                           <p className="text-sm font-black text-[#000080] truncate">{effectivePlan.local.name}</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-blue-700">
                       {effectivePlan.local.price?.replace(/,$/, '').startsWith('₹') 
                         ? effectivePlan.local.price.replace(/,$/, '') 
                         : `₹${effectivePlan.local.price?.replace(/,$/, '') || '0'}`}
                     </p>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {effectivePlan.local.detail || 'In-city Discovery Cab'}
                      </span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 4. DAY-BY-DAY JOURNEY (DETAILED) ────────────────────────────── */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">Suggested Journey Itinerary</h3>
              <div className="flex items-center gap-2">
                <CompassIcon size={24} className="text-saffron drop-shadow-sm" />
                <span className="text-xs font-black text-saffron uppercase tracking-widest">Odyssey Guide</span>
              </div>
           </div>

           <div className="space-y-4">
              {journeyDays.length === 0 ? (
                <div className="p-8 bg-white border border-dashed border-orange-200 rounded-3xl text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-saffron/90" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-[#000080] uppercase tracking-tight italic">No journey timeline yet</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-sm:mx-auto">
                      Day-by-day activities appear after the planner saves an itinerary (Discover → Confirm & Plan). Older bookings may only have totals until you regenerate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/planner')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-saffron text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
                  >
                    Open Yatra Studio
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ) : (
                journeyDays.map((day, idx) => (
                  <motion.div key={idx} className="p-6 bg-white border border-orange-100 rounded-3xl space-y-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="text-[14px] font-black text-saffron whitespace-nowrap">
                        {(() => {
                          const baseDate = effectivePlan.startDate || startDate;
                          if (!baseDate) return day.day;
                          const d = new Date(baseDate);
                          d.setDate(d.getDate() + idx);
                          return isoToDdMonthYy(d.toISOString().split('T')[0]);
                        })()}
                      </div>
                      <h4 className="text-base font-black text-[#000080] uppercase tracking-tight italic">{day.title}</h4>
                    </div>

                    <div className="space-y-4 border-l border-orange-100 ml-4 pl-6">
                      {day.activities.map((act, aIdx) => (
                        <div key={aIdx} className="relative">
                          <div className="absolute -left-[27px] top-1.5 w-1 h-1 rounded-full bg-orange-200" />
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 shrink-0">{act.time}</span>
                            <p className="text-[13px] text-slate-600 font-bold leading-relaxed">{act.activity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
           </div>
        </section>

        {/* ── 5. REGIONAL DINING ──────────────────────────────────────────── */}
        {effectivePlan.foodSpotsList && effectivePlan.foodSpotsList.length > 0 && effectivePlan.foodSpotsList.some((f: any) => f.name && f.must) && (
          <section className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">Regional Dining</h3>
                <div className="flex items-center gap-2">
                 <Utensils size={24} className="text-saffron drop-shadow-sm" />
                 <span className="text-xs font-black text-saffron uppercase tracking-widest">Local Flavours</span>
               </div>
             </div>

             <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                {effectivePlan.foodSpotsList
                  .filter((f: any) => f.name && f.must && !f.name.includes('_')) // Filter out placeholders like RESTAURANT_TYPE
                  .map((f: Record<string, string | undefined>, i: number) => (
                   <div key={i} className="min-w-[200px] p-5 bg-white border border-orange-100 rounded-3xl space-y-3 shadow-sm">
                      <div>
                         <p className="text-[8px] font-black text-saffron uppercase tracking-widest mb-1">{f.type?.replace(/_/g, ' ') || 'Specialty'}</p>
                         <p className="text-xs font-black text-[#000080] uppercase">{f.name}</p>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic border-t border-orange-50 pt-2">
                         <span className="text-saffron">Try:</span> {f.must}
                      </p>
                   </div>
                ))}
             </div>
          </section>
        )}

        {/* ── 6. SAFETY & GUIDANCE ────────────────────────────────────────── */}
        <section className="space-y-4">
           <div className="p-6 bg-gradient-to-br from-orange-50 to-transparent border border-orange-100 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center border border-orange-200 shrink-0">
                 <Shield className="text-saffron w-7 h-7" />
              </div>
              <div>
                 <h4 className="text-[10px] font-black text-saffron uppercase tracking-widest mb-1">Caring Tip</h4>
                 <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    {effectivePlan.safety?.tips?.[0] || 'Keep digital copies of all your travel documents and stay hydrated throughout your journey.'}
                 </p>
              </div>
           </div>
        </section>

        {/* ── 7. QUICK ACTIONS ───────────────────────────── */}
        <section className="pt-4">
           <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-orange-100 rounded-2xl hover:bg-orange-50 transition-all text-center shadow-sm">
              <Download className="text-green w-5 h-5" />
              <div className="min-w-0 text-left">
                 <p className="text-[10px] font-black text-[#000080] uppercase truncate">Download PDF</p>
                 <p className="text-[8px] text-slate-400 font-black uppercase">Full Guide</p>
              </div>
           </button>
        </section>

      </main>

      {/* ── 8. BOTTOM NAVIGATION ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-3xl border-t border-orange-100 px-8 py-6 flex items-center justify-between z-[200]">
        {[
          { icon: Home, label: 'Home', href: '/', active: false },
          { icon: Compass, label: 'Explore', href: '/planner', active: false },
          { icon: Plane, label: 'Trips', href: '/my-trip', active: true },
          { icon: User, label: 'Profile', href: '/profile', active: false }
        ].map((item, i) => (
          <button 
            key={i}
            onClick={() => {
              if (item.href === '/profile') {
                useTripPlannerStore.getState().setIsProfileOpen(true);
                router.push('/planner');
              } else {
                router.push(item.href);
              }
            }}
            className={`flex flex-col items-center gap-1.5 transition-all ${item.active ? 'text-saffron' : 'text-slate-400 hover:text-saffron'}`}
          >
            <item.icon size={22} className={item.active ? 'drop-shadow-[0_0_8px_rgba(255,103,31,0.3)]' : ''} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${item.active ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}

// Missing Lucide Icons (Redefined correctly)
function BadgeIndianRupee({ size = 16, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" />
    </svg>
  );
}
