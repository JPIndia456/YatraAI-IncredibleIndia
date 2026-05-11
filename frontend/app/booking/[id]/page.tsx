'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ItineraryReview from '@/components/ItineraryReview';
import ItineraryCustomizer from '@/components/ItineraryCustomizer';
import BookingConfirmation from '@/components/BookingConfirmation';
import { ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type BookingStep = 'REVIEW' | 'CUSTOMIZE' | 'PASSENGERS' | 'PAYMENT' | 'CONFIRMED';

export default function BookingPage() {
  const { id } = useParams() as { id: string };
  const [step, setStep] = useState<BookingStep>('REVIEW');
  const [itinerary, setItinerary] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      if (!id || id === 'undefined') return;

      const { data, error } = await supabase
        .from('yatra_bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      setItinerary({
        id: data.id,
        from: data.trip_data?.from || data.origin,
        to: data.trip_data?.to || data.destination,
        startDate: data.trip_data?.startDate,
        endDate: data.trip_data?.endDate,
        tripType: data.trip_data?.tripType || (data.trip_data?.endDate ? 'round' : 'single'),
        total: data.total_amount,
        adults: data.trip_data?.adults || 1,
        kids: data.trip_data?.kids || 0,
        passengers: data.passengers || data.trip_data?.passengers || []
      });
      setPassengers(data.passengers || data.trip_data?.passengers || []);
      setLoading(false);
    }
    fetchBooking();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-mono">Syncing Vectors...</div>;
  if (!itinerary) return <div className="p-20 text-center font-mono text-red-500">Booking Not Found</div>;

  return (
    <div className="py-12 space-y-12 max-w-5xl mx-auto px-4">
      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-4 text-xs font-black uppercase tracking-widest text-zinc-500">
        <span className={step === 'REVIEW' ? 'text-white' : ''}>Review</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'CUSTOMIZE' ? 'text-white' : ''}>Customize</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'PASSENGERS' ? 'text-white' : ''}>Travelers</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'PAYMENT' ? 'text-white text-saffron' : ''}>Verify</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'CONFIRMED' ? 'text-white' : ''}>Success</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {step === 'REVIEW' && (
            <ItineraryReview itinerary={itinerary} onProceed={() => setStep('CUSTOMIZE')} />
          )}

          {step === 'CUSTOMIZE' && (
            <ItineraryCustomizer 
              initialItinerary={itinerary} 
              onSave={(updated: any) => {
                setItinerary(updated);
                setStep('PASSENGERS');
              }} 
            />
          )}

          {step === 'PASSENGERS' && (
             <div className="glass-panel p-8 text-center space-y-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Traveler Manifest</h2>
                <p className="text-zinc-400">Please confirm traveler details before final verification.</p>
                <button 
                  onClick={() => setStep('PAYMENT')}
                  className="px-10 py-4 bg-blue-600 rounded-3xl font-bold"
                >
                  Continue to Verification
                </button>
             </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-8">
              <ShieldCheck className="w-16 h-16 text-saffron animate-pulse" />
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter">Secure Confirmation</h1>
                <p className="text-zinc-400 max-w-md mx-auto">
                  Finalizing your journey from {itinerary.from} to {itinerary.to}.
                </p>
              </div>
              <button 
                onClick={() => setStep('CONFIRMED')}
                className="px-12 py-5 bg-[#FF9933] text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-xl shadow-saffron/20"
              >
                Confirm & Finalize Booking
              </button>
            </div>
          )}

          {step === 'CONFIRMED' && (
            <BookingConfirmation bookingId={id} pnr="TP-PNR-CONF" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
