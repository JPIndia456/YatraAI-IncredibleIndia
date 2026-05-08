'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ItineraryReview from '@/components/ItineraryReview';
import ItineraryCustomizer from '@/components/ItineraryCustomizer';
import BookingConfirmation from '@/components/BookingConfirmation';
import PaymentButton from '@/components/UpiIntentButton';
import { ChevronRight, ChevronLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type BookingStep = 'REVIEW' | 'CUSTOMIZE' | 'PASSENGERS' | 'PAYMENT' | 'CONFIRMED';

const AIRPORT_MAP: Record<string, string> = {
  'Mumbai': 'BOM', 'Delhi': 'DEL', 'Bangalore': 'BLR', 'Chennai': 'MAA', 
  'Kolkata': 'CCU', 'Hyderabad': 'HYD', 'Pune': 'PNQ', 'Ahmedabad': 'AMD',
  'Jaipur': 'JAI', 'Lucknow': 'LKO', 'Goa': 'GOI', 'Kochi': 'COK',
  'Guwahati': 'GAU', 'Bhubaneswar': 'BBI', 'Patna': 'PAT', 'Ranchi': 'IXR',
  'Chandigarh': 'IXC', 'Indore': 'IDR', 'Bhopal': 'BHO', 'Surat': 'STV',
  'Varanasi': 'VNS', 'Amritsar': 'ATQ', 'Udaipur': 'UDR', 'Jodhpur': 'JDH'
};

export default function BookingPage() {
  const { id } = useParams() as { id: string };
  const [step, setStep] = useState<BookingStep>('REVIEW');
  const [itinerary, setItinerary] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real booking data from Supabase
  useEffect(() => {
    async function fetchBooking() {
      if (!id || id === 'undefined') return;

      const { data, error } = await supabase
        .from('tourplan_bookings')
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
        transport: data.trip_data?.transport,
        hotel: data.trip_data?.hotel,
        local: data.trip_data?.local,
        segments: data.trip_data?.transport ? [
          {
            from: data.trip_data.from || data.origin,
            to: data.trip_data.to || data.destination,
            date: data.trip_data.startDate,
            duration: data.trip_data.transport.name,
            type: data.trip_data.transport.label
          }
        ] : [],
        baseFare: Math.round(data.total_amount * 0.9),
        total: data.total_amount,
        activities: data.trip_data?.dayPlan || [],
        adults: data.trip_data?.adults || 1,
        kids: data.trip_data?.kids || 0,
        passengers: data.passengers || data.trip_data?.passengers || []
      });
      setPassengers(data.passengers || data.trip_data?.passengers || []);
      setLoading(false);
    }
    fetchBooking();
  }, [id]);

  const handleForwardToRiya = () => {
    const fromCode = AIRPORT_MAP[itinerary.from] || 'BOM';
    const toCode = AIRPORT_MAP[itinerary.to] || 'DEL';
    
    // Format: DD MMM YYYY (e.g. 29 Apr 2026)
    const d = new Date(itinerary.startDate || Date.now());
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const tripType = itinerary?.tripType === 'round' || itinerary?.endDate ? 'R' : 'O';
    const params = new URLSearchParams({
      from: `${itinerary.from}, India[${fromCode}]`,
      to: `${itinerary.to}, India[${toCode}]`,
      departure_date: formattedDate,
      adult: itinerary.adults.toString(),
      child: itinerary.kids.toString(),
      infant: '0',
      class: 'Economy',
      tripType,
      search_currency: 'INR',
      fromCountry: 'IN',
      toCountry: 'IN',
      fare: 'N'
    });

    const url = `https://riya.travel/in/routes/search?${params.toString()}`;
    
    // Save passengers to Supabase before redirecting
    savePassengers().then(() => {
      window.open(url, '_blank');
      toast.success('Forwarding to Riya Travel', { description: 'Securely transferring your itinerary...' });
    });
  };

  const savePassengers = async () => {
    if (!id || passengers.length === 0) return;
    
    const { error } = await supabase
      .from('tourplan_bookings')
      .update({ 
        passengers,
        trip_details: {
          ...itinerary,
          passengers
        }
      })
      .eq('id', id);

    if (error) {
      console.error('Error saving passengers:', error);
      toast.error('Sync Error', { description: 'Failed to update passenger manifest.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-12">
        <div className="relative w-40 h-40">
          <motion.div 
            animate={{ rotate: 360, opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-[1px] border-dashed border-blue-500/40 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360, scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-6 border-2 border-blue-600/60 rounded-full border-t-transparent"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            <div className="text-[10px] font-mono text-blue-500/80 uppercase tracking-widest">Processing</div>
          </div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black tracking-tighter gradient-text">Syncing Vectors</h2>
          <p className="text-zinc-500 text-sm font-mono max-w-xs mx-auto">Connecting to Indian Railways Cluster for Optimal Berth Positioning...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Booking Not Found</h2>
          <p className="text-zinc-400 mt-2">The requested booking could not be retrieved. Please try again.</p>
        </div>
        <button 
          onClick={() => window.location.href = '/planner'}
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-semibold hover:border-zinc-700 transition-all"
        >
          Return to Planner
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 space-y-12 max-w-5xl mx-auto">
      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-4 text-sm font-medium text-zinc-500">
        <span className={step === 'REVIEW' ? 'text-white' : ''}>Review</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'CUSTOMIZE' ? 'text-white' : ''}>Customize</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'PASSENGERS' ? 'text-white' : ''}>Passengers</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'PAYMENT' ? 'text-white' : ''}>Verify</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 'CONFIRMED' ? 'text-white' : ''}>Confirm</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 'REVIEW' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold">Review Your Journey</h1>
                <button 
                  onClick={() => setStep('CUSTOMIZE')}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-blue-500 transition-all font-semibold"
                >
                  Edit Plans <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <ItineraryReview 
                itinerary={itinerary} 
                onProceed={() => setStep('CUSTOMIZE')} 
              />
            </div>
          )}

          {step === 'CUSTOMIZE' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('REVIEW')}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-all font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <h1 className="text-4xl font-bold">Personalize Experience</h1>
                <div className="w-32"></div> {/* Spacer */}
              </div>
              <ItineraryCustomizer 
                initialItinerary={itinerary} 
                onSave={(updated: any) => {
                  setItinerary(updated);
                  setStep('PASSENGERS');
                }} 
              />
            </div>
          )}

          {step === 'PASSENGERS' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('CUSTOMIZE')}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-all font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <h1 className="text-4xl font-bold">Passenger Details</h1>
                <div className="w-32"></div>
              </div>

              <div className="shell-panel p-8 space-y-8">
                {/* Solo Traveler Safety Banner */}
                {(itinerary.adults + itinerary.kids === 1) && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white tracking-tight text-lg">Solo Traveler Protection Active</h4>
                      <p className="text-zinc-400 text-sm">We've identified you're traveling solo. Our **TourPlan Shield** covers 24/7 safety alerts and verified solo-safe transport.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Enable Shield</label>
                      <input type="checkbox" className="w-5 h-5 accent-blue-500 rounded-lg" defaultChecked />
                    </div>
                  </motion.div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="pb-2 pl-6">Sr. No.</th>
                        <th className="pb-2">Full Name</th>
                        <th className="pb-2">Age</th>
                        <th className="pb-2">Sex</th>
                        <th className="pb-2 pr-6">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: itinerary.adults + itinerary.kids }).map((_, i) => {
                        const isKid = i >= itinerary.adults;
                        return (
                          <tr key={i} className="bg-zinc-900/50 group hover:bg-zinc-900 transition-all">
                            <td className="py-5 pl-6 rounded-l-3xl border-y border-l border-zinc-800 font-mono text-zinc-500">{i + 1}</td>
                            <td className="py-5 border-y border-zinc-800">
                              <input 
                                type="text" 
                                placeholder="Name as per ID"
                                className="bg-transparent border-none outline-none w-full text-white placeholder:text-zinc-700 font-medium"
                                onChange={(e) => {
                                  const newPass = [...passengers];
                                  newPass[i] = { ...newPass[i], name: e.target.value, type: isKid ? 'child' : 'adult' };
                                  setPassengers(newPass);
                                }}
                              />
                            </td>
                            <td className="py-5 border-y border-zinc-800">
                              <input 
                                type="number" 
                                placeholder="Age"
                                className="bg-transparent border-none outline-none w-16 text-white placeholder:text-zinc-700 font-medium"
                                onChange={(e) => {
                                  const newPass = [...passengers];
                                  newPass[i] = { ...newPass[i], age: e.target.value };
                                  setPassengers(newPass);
                                }}
                              />
                            </td>
                            <td className="py-5 border-y border-zinc-800">
                              <select 
                                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                onChange={(e) => {
                                  const newPass = [...passengers];
                                  newPass[i] = { ...newPass[i], sex: e.target.value };
                                  setPassengers(newPass);
                                }}
                              >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td className="py-5 pr-6 rounded-r-3xl border-y border-r border-zinc-800">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isKid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {isKid ? 'Child' : 'Adult'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-8 border-t border-zinc-800 flex justify-between items-center">
                  <p className="text-caption italic">Please ensure details match your government-issued ID for seamless boarding.</p>
                  <button 
                    onClick={() => {
                      const total = itinerary.adults + itinerary.kids;
                      if (passengers.length < total || passengers.some(p => !p?.name || !p?.age || !p?.sex)) {
                        toast.error('Missing Details', { description: 'Please fill name, age, and sex for all passengers.' });
                        return;
                      }
                      savePassengers().then(() => {
                        setStep('PAYMENT');
                      });
                    }}
                    className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-3xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all"
                  >
                    Confirm & Proceed to Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-12">
              <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="w-10 h-10 text-blue-500" />
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-bold">Ready to Launch?</h1>
                <p className="text-xl text-zinc-400 max-w-lg mx-auto">
                  Your trip from <span className="text-white">{itinerary.from || 'Source'}</span> to <span className="text-white">{itinerary.to || 'Destination'}</span> is ready for booking. Final amount: <span className="text-emerald-400 font-bold">₹{itinerary.total}</span>
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => setStep('REVIEW')}
                  className="px-8 py-5 bg-zinc-900 border border-zinc-800 rounded-3xl font-semibold text-lg hover:border-zinc-700 transition-all"
                >
                  Review Again
                </button>
                <PaymentButton 
                  bookingId={id} 
                  label="Pay with UPI"
                  gradient="from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  amount={itinerary.total} 
                  onSuccess={() => setStep('CONFIRMED')}
                />
                
                <button 
                  onClick={handleForwardToRiya}
                  className="px-8 py-5 bg-blue-600 rounded-3xl font-bold text-lg hover:bg-blue-500 transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20"
                >
                  <img src="https://riya.travel/Content/images/logo.png" alt="Riya" className="h-6 brightness-0 invert" />
                  Secure Checkout via Riya Travel
                </button>

                <PaymentButton 
                  bookingId={id} 
                  label="💳 Credit Card"
                  gradient="from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                  amount={itinerary.total} 
                  onSuccess={() => setStep('CONFIRMED')}
                />
              </div>
            </div>
          )}

          {step === 'CONFIRMED' && (
            <BookingConfirmation 
              bookingId={id} 
              pnr="TP4P9Q" 
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
