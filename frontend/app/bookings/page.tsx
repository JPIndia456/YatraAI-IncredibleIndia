'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Train, Plane, Bus, Car, Hotel, Star, X, XCircle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useTripStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

type Booking = {
  id: string;
  ref: string;
  origin: string;
  destination: string;
  tier: string;
  transport: string;
  hotel: string;
  total: number;
  date: string;
  status: 'confirmed' | 'upcoming' | 'completed' | 'cancelled';
  rating?: number;
};


export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { bookings: optimisticBookings, removeBooking } = useTripStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyBookings() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('yatra_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: Booking[] = data.map((b: any) => ({
            id: b.id,
            total: b.total_price,
            ref: b.trip_details?.bookingRef || b.id.slice(0, 8),
            origin: b.trip_details?.from || 'Unknown',
            destination: b.trip_details?.to || 'Unknown',
            tier: b.trip_details?.tier || 'Custom',
            transport: b.trip_details?.transport || 'Transport Service',
            hotel: b.trip_details?.hotel || 'Accommodation',
            date: b.trip_details?.date || new Date(b.created_at).toISOString().split('T')[0],
            status: b.status?.toLowerCase() || 'confirmed',
            rating: b.rating
          }));
          setBookings(mapped);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) fetchMyBookings();
  }, [user, authLoading]);
  const [filter, setFilter] = useState<string>('all');
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState(0);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const statusColors: any = {
    confirmed: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: '✅ Confirmed' },
    upcoming: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: '📅 Upcoming' },
    completed: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', text: 'text-zinc-400', label: '✔️ Completed' },
    cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: '❌ Cancelled' },
    optimistic: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: '⏳ Confirming...' },
    failed: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: '⚠️ Failed — Retry' },
  };

  const handleCancel = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    setCancelModal(null);
    toast.success('Booking Cancelled', { description: 'Refund of 85% will be processed in 5-7 business days.' });
  };

  const handleRate = (id: string, rating: number) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, rating } : b));
    setRatingModal(null);
    toast.success('Thank you!', { description: `You rated this trip ${rating}/5 stars` });
  };

  return (
    <div className="pt-4 pb-12 space-y-8 max-w-4xl mx-auto">
      <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onClick={() => router.push('/planner')} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">📋 My Bookings</h1>
        <p className="text-sm text-zinc-500 mt-1">Track, manage, and review your trips</p>
      </motion.div>

      {/* ── Optimistic Bookings Banner ─────────────────────────────────── */}
      <AnimatePresence>
        {optimisticBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Just Booked</p>
            {optimisticBookings.map((ob) => {
              const sc = statusColors[ob.status] || statusColors.upcoming;
              return (
                <motion.div
                  key={ob.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center justify-between ${sc.bg} border ${sc.border} rounded-2xl px-5 py-4`}
                >
                  <div className="flex items-center gap-3">
                    {ob.status === 'optimistic' && <Loader2 className={`w-4 h-4 ${sc.text} animate-spin`} />}
                    {ob.status === 'confirmed' && <CheckCircle className={`w-4 h-4 ${sc.text}`} />}
                    {ob.status === 'failed' && <XCircle className={`w-4 h-4 ${sc.text}`} />}
                    <div>
                      <p className={`text-xs font-black ${sc.text}`}>{ob.origin} → {ob.destination}</p>
                      <p className="text-[9px] text-zinc-600">{ob.tier} · {ob.transport} · ₹{ob.total.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${sc.bg} border ${sc.border} ${sc.text}`}>{sc.label}</span>
                    {(ob.status === 'confirmed' || ob.status === 'failed') && (
                      <button onClick={() => removeBooking(ob.id)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all border ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
            {f === 'all' ? `All (${bookings.length})` : `${f} (${bookings.filter(b => b.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Booking Cards */}
      <div className="space-y-4">
        {filtered.map((booking, i) => {
          const sc = statusColors[booking.status];
          return (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${sc.bg} ${sc.border} ${sc.text} border`}>{sc.label}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{booking.ref}</span>
                  </div>
                  <h3 className="text-lg font-black">{booking.origin} <span className="text-zinc-600">→</span> {booking.destination}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded-lg flex items-center gap-1"><Calendar className="w-3 h-3" /> {booking.date}</span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded-lg flex items-center gap-1"><Train className="w-3 h-3" /> {booking.transport}</span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-1 rounded-lg flex items-center gap-1"><Hotel className="w-3 h-3" /> {booking.hotel}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-black text-blue-700">₹{booking.total.toLocaleString('en-IN')}</p>
                  <div className="text-[10px] text-zinc-600">{booking.tier} Package</div>

                  {/* Rating Stars */}
                  {booking.status === 'completed' && booking.rating && (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= booking.rating! ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-1">
                    {booking.status === 'upcoming' && (
                      <button onClick={() => setCancelModal(booking.id)} className="text-[10px] px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-bold hover:bg-red-500/20 transition-all">
                        Cancel
                      </button>
                    )}
                    {booking.status === 'completed' && !booking.rating && (
                      <button onClick={() => setRatingModal(booking.id)} className="text-[10px] px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg font-bold hover:bg-amber-500/20 transition-all">
                        Rate Trip
                      </button>
                    )}
                    {booking.status !== 'cancelled' && (
                      <button onClick={() => router.push(`/itinerary?origin=${booking.origin}&destination=${booking.destination}&tier=${booking.tier}&transport=${booking.transport}&hotel=${booking.hotel}&total=${booking.total}`)} className="text-[10px] px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg font-bold hover:bg-blue-500/20 transition-all flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-5xl mb-4">🧳</div>
          <p className="font-bold">No bookings found</p>
          <p className="text-xs mt-1">Start planning your next trip!</p>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-black">Cancel Booking?</h3>
                <p className="text-xs text-zinc-500 mt-1">85% refund will be processed in 5-7 business days. This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelModal(null)} className="flex-1 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-700 transition-all">Keep Booking</button>
                <button onClick={() => handleCancel(cancelModal)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all">Yes, Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
              <button onClick={() => setRatingModal(null)} className="absolute top-4 right-4 text-zinc-500"><X className="w-5 h-5" /></button>
              <div className="text-center">
                <h3 className="text-lg font-black">Rate Your Trip</h3>
                <p className="text-xs text-zinc-500 mt-1">How was your experience?</p>
                <div className="flex gap-2 justify-center mt-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => handleRate(ratingModal, s)} className="transition-transform hover:scale-125">
                      <Star className={`w-8 h-8 ${s <= hoverRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-2">{hoverRating === 0 ? 'Tap a star' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][hoverRating]}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
