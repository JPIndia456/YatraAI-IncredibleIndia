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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
function deriveJourneyDays(plan: Record<string, unknown> | null | undefined) {
  if (!plan) return [];
  const raw = plan.dayPlan ?? plan.itinerary;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map((day: Record<string, unknown>, idx: number) => {
    let activities = normalizeDayActivities(day?.activities);
    const title = String(day?.title || '').trim() || `Day ${idx + 1}`;
    if (activities.length === 0) {
      activities = [
        {
          time: '—',
          activity:
            'No timed steps stored for this day. Open TourPlan Studio, confirm your trip, and regenerate the itinerary to fill this timeline.',
        },
      ];
    }
    const rawDay = day?.day;
    let dayLabel: string | number = idx + 1;
    if (typeof rawDay === 'number' && Number.isFinite(rawDay)) dayLabel = rawDay;
    else if (typeof rawDay === 'string' && rawDay.trim()) dayLabel = rawDay.trim();

    return {
      day: dayLabel,
      title,
      date: typeof day?.date === 'string' ? day.date : undefined,
      activities,
    };
  });
}

export default function MyTripPage() {
  const router = useRouter();
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
    const storedSync = localStorage.getItem(`tourplan_sync_${plan?.destination}`);
    if (storedSync) setLastSynced(storedSync);
  }, [plan?.destination]);

  useEffect(() => {
    if (!user?.id) return;
    if (plan) return;

    const loadLatestTrip = async () => {
      setLoadingDbTrip(true);
      try {
        const { data, error } = await supabase
          .from('tourplan_bookings')
          .select('id, origin, destination, status, pnr, confirmed_at, created_at, total_amount, trip_data, trip_details')
          .eq('user_id', user.id)
          .in('status', ['pending_payment', 'paid', 'pending_provider', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const tripData = (data as any).trip_data || {};
        const tripDetails = (data as any).trip_details || {};
        setDbTrip({
          ...tripData,
          destination: tripData.destination || tripData.to || data.destination,
          from: tripData.from || tripData.origin || data.origin,
          totalEstimate: tripData.totalEstimate || (data.total_amount ? `₹${Number(data.total_amount).toLocaleString('en-IN')}` : '₹0'),
          passengers: tripData.passengers || tripDetails.passengers || [],
          pnr: data.pnr || tripData.pnr || null,
          bookingStatus: data.status || tripData.bookingStatus || 'confirmed',
        });
      } catch (err) {
        console.error('Load My Trips Error:', err);
      } finally {
        setLoadingDbTrip(false);
      }
    };

    loadLatestTrip();
  }, [user?.id, plan]);

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
      const { error } = await supabase.from('tourplan_bookings').upsert({
        user_id: user.id,
        origin: effectivePlan.from,
        destination: effectivePlan.destination,
        trip_data: effectivePlan,
        total_amount: typeof effectivePlan.totalNum === 'number' ? effectivePlan.totalNum : 0,
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      }, { onConflict: 'user_id, destination' });

      if (error) throw error;
      
      const now = new Date().toLocaleTimeString();
      setLastSynced(now);
      localStorage.setItem(`tourplan_sync_${effectivePlan.destination}`, now);
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
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center text-white">
        <Sparkles className={`text-cyan-500/20 mb-6 ${loadingDbTrip ? 'animate-pulse' : ''}`} size={60} />
        <h1 className="text-xl font-black mb-2 uppercase tracking-widest text-cyan-400">
          {loadingDbTrip ? 'Loading My Trips' : 'No Active Discovery'}
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          {loadingDbTrip ? 'Fetching your latest confirmed booking...' : 'Your curated travel plans will appear here after selection.'}
        </p>
        <button 
          onClick={() => router.push('/planner')}
          className="px-8 py-3 bg-cyan-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
        >
          Return to Planner
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => (
    <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
      status === 'Confirmed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    }`}>
      {status}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans antialiased selection:bg-cyan-500/30">
      
      {/* ── 1. STICKY HEADER ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 cursor-pointer" onClick={() => router.push('/')}>
            <PlaneTakeoff className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic leading-none">TOUR<span className="text-cyan-400">PLAN</span></h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Discovery Secured • 2026</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-zinc-400">
            <Share2 size={18} />
          </button>
          <button onClick={handleSyncToCloud} disabled={syncing} className="p-2.5 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/10">
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8 space-y-12 pb-32">
        
        {/* ── 2. HERO SUMMARY ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-[2.5rem] p-8 overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-transparent to-blue-900/10" />
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
               <div>
                 <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-2">Selected Adventure</div>
                 <h2 className="text-3xl font-black tracking-tight leading-none uppercase italic">{effectivePlan.destination}</h2>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Via {origin || 'Direct Access'}</p>
               </div>
               {getStatusBadge('Confirmed')}
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={10} className="text-cyan-400" /> Date Range
                  </p>
                  <p className="text-sm font-black text-white">{startDate} – {endDate}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <User size={10} className="text-cyan-400" /> Travelers
                  </p>
                  <p className="text-sm font-black text-white">{adults}A, {kids}K • {effectivePlan.duration}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <BadgeIndianRupee size={10} className="text-cyan-400" /> Total Cost
                  </p>
                  <p className="text-2xl font-black text-cyan-400 tracking-tighter italic leading-none">{effectivePlan.totalEstimate}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={10} className="text-cyan-400" /> Safety
                  </p>
                  <p className="text-sm font-black text-white">Score: {effectivePlan.safety?.score || '9.2'}/10</p>
               </div>
            </div>

            {(effectivePlan.passengers?.length || 0) > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Traveler Manifest</p>
                <div className="space-y-1.5">
                  {(effectivePlan.passengers || []).map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-300">
                      <span className="font-semibold">{p.name || `Traveler ${idx + 1}`}</span>
                      <span className="text-zinc-500 uppercase">{p.type || 'adult'}{p.age ? ` · ${p.age}` : ''}</span>
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
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Logistics & Transfers</h3>
             <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Real-time Data</span>
          </div>

          <div className="relative pl-12 space-y-6">
            <div className="absolute left-6 top-4 bottom-4 w-[1px] bg-white/5" />

            {/* Transports */}
            {effectivePlan.transportList?.map((t: Record<string, string | undefined>, i: number) => (
              <div key={i} className="relative group">
                <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 z-10 border border-[#020617] group-hover:scale-150 transition-transform" />
                <div className="p-5 bg-zinc-900/40 border border-white/10 rounded-3xl space-y-4">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                           {(t.mode?.toLowerCase() || '').includes('flight') ? <Plane size={18} className="text-blue-400" /> : <Train size={18} className="text-cyan-500" />}
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t.mode}</p>
                           <p className="text-xs font-bold text-white">{t.from} → {effectivePlan.destination}</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-white">{t.price}</p>
                   </div>
                   <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      <span>Duration: {t.duration}</span>
                      <span className="text-cyan-400">{t.detail || 'Confirmed'}</span>
                   </div>
                </div>
              </div>
            ))}

            {/* Hotels */}
            {effectivePlan.hotelsList?.map((h: Record<string, string | undefined>, i: number) => (
              <div key={i} className="relative group">
                <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-emerald-400 z-10 border border-[#020617] group-hover:scale-150 transition-transform" />
                <div className="p-5 bg-zinc-900/40 border border-white/10 rounded-3xl space-y-4">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center border border-emerald-500/20">
                           <Hotel size={18} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Accommodation</p>
                           <p className="text-xs font-bold text-white truncate">{h.name}</p>
                        </div>
                     </div>
                     <p className="text-xs font-black text-emerald-400">{h.price}</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{h.rating} Rating • {h.tier}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. DAY-BY-DAY JOURNEY (DETAILED) ────────────────────────────── */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Journey Itinerary</h3>
              <CompassIcon size={14} className="text-cyan-500" />
           </div>

           <div className="space-y-4">
              {journeyDays.length === 0 ? (
                <div className="p-8 bg-zinc-900/30 border border-dashed border-white/15 rounded-3xl text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-cyan-400/90" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-white uppercase tracking-tight italic">No journey timeline yet</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                      Day-by-day activities appear after the planner saves an itinerary (Discover → Confirm & Plan). Older bookings may only have totals until you regenerate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/planner')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                  >
                    Open TourPlan Studio
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ) : (
                journeyDays.map((day, idx) => (
                  <motion.div key={idx} className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400">
                        {day.day}
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight italic">{day.title}</h4>
                    </div>

                    <div className="space-y-4 border-l border-white/5 ml-4 pl-6">
                      {day.activities.map((act, aIdx) => (
                        <div key={aIdx} className="relative">
                          <div className="absolute -left-[27px] top-1.5 w-1 h-1 rounded-full bg-zinc-700" />
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-0.5 shrink-0">{act.time}</span>
                            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">{act.activity}</p>
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
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Regional Dining</h3>
              <Utensils size={14} className="text-cyan-500" />
           </div>

           <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {effectivePlan.foodSpotsList?.map((f: Record<string, string | undefined>, i: number) => (
                 <div key={i} className="min-w-[200px] p-5 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-3">
                    <div>
                       <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest mb-1">{f.type}</p>
                       <p className="text-xs font-black text-white uppercase">{f.name}</p>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-bold leading-relaxed italic border-t border-white/5 pt-2">
                       <span className="text-cyan-500">Try:</span> {f.must}
                    </p>
                 </div>
              ))}
           </div>
        </section>

        {/* ── 6. SAFETY & GUIDANCE ────────────────────────────────────────── */}
        <section className="space-y-4">
           <div className="p-6 bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-[2.5rem] flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                 <Shield className="text-blue-400 w-7 h-7" />
              </div>
              <div>
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Caring Tip</h4>
                 <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    {effectivePlan.safety?.tips?.[0] || 'Keep digital copies of all your travel documents and stay hydrated throughout your journey.'}
                 </p>
              </div>
           </div>
        </section>

        {/* ── 7. QUICK ACTIONS ───────────────────────────── */}
        <section className="pt-4">
           <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-3 p-4 bg-zinc-900/60 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-all text-center">
              <Download className="text-emerald-400 w-5 h-5" />
              <div className="min-w-0 text-left">
                 <p className="text-[10px] font-black text-white uppercase truncate">Download PDF</p>
                 <p className="text-[8px] text-zinc-600 font-black uppercase">Full Guide</p>
              </div>
           </button>
        </section>

      </main>

      {/* ── 8. BOTTOM NAVIGATION ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#020617]/80 backdrop-blur-3xl border-t border-white/5 px-8 py-6 flex items-center justify-between z-[200]">
        {[
          { icon: Home, label: 'Home', href: '/', active: false },
          { icon: Compass, label: 'Explore', href: '/planner', active: false },
          { icon: Plane, label: 'Trips', href: '/my-trip', active: true },
          { icon: User, label: 'Profile', href: '/profile', active: false }
        ].map((item, i) => (
          <button 
            key={i}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-1.5 transition-all ${item.active ? 'text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <item.icon size={22} className={item.active ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''} />
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

function Cloud({ size = 16, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.5 19A4.5 4.5 0 0 0 13 14.5c-1.12 0-2.14.4-2.92 1.07A4 4 0 1 0 3 17.5a4.5 4.5 0 0 0 14.5 1.5Z" />
    </svg>
  );
}
