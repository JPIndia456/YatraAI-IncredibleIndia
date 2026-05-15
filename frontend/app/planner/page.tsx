'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, RotateCcw, MapPin, Calendar, Wallet, Users, 
  Search, ShieldCheck, Zap, Globe, MessageSquare, Info, Star, Clock,
  Navigation, Plane, Train, Hotel, Bus, Ship
} from 'lucide-react';
import { toast } from 'sonner';

// Store & Context
import { 
  useTripStore, 
  useTripPlannerStore, 
  useAIBrainStore, 
  useTourGuideStore 
} from '@/lib/store';
import { useLanguage, type LanguageCode } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { mergeApiHotelsWithCuratedSeeds, supplementFerriesForDestination, supplementTransportForDestination } from '@/lib/hotelDestinationBoost';
import { speakIndianText } from '@/lib/bhashini';

// Components
import StepInputs, { type PlannerInputs } from '@/components/planner/StepInputs';
import StepSuggestions from '@/components/planner/StepSuggestions';
import StepPlanning from '@/components/planner/StepPlanning';
import StepSelection from '@/components/planner/StepSelection';
import StepBooking from '@/components/planner/StepBooking';
import StepSuccess from '@/components/planner/StepSuccess';
import StepIndicator from '@/components/planner/StepIndicator';
import NavigationWrapper from '@/components/layout/NavigationWrapper';

// ──────────────────────────────────────────────────────────────────────────────
// Types & Schema
// ──────────────────────────────────────────────────────────────────────────────

type Stage = 'inputs' | 'suggestions' | 'planning' | 'results' | 'selection' | 'booking' | 'success';

const WIZARD_STEPS = [
  { id: 'inputs', label: 'Inputs', emoji: '📍' },
  { id: 'suggestions', label: 'Suggestions', emoji: '✨' },
  { id: 'results', label: 'Itinerary', emoji: '🗺️' },
  { id: 'selection', label: 'Cart', emoji: '🛒' },
  { id: 'booking', label: 'Checkout', emoji: '🔒' },
  { id: 'success', label: 'Confirmed', emoji: '✅' },
];

const DONE_MAP: Record<Stage, string[]> = {
  inputs: [],
  suggestions: ['inputs'],
  planning: ['inputs', 'suggestions'],
  results: ['inputs', 'suggestions'],
  selection: ['inputs', 'suggestions', 'results'],
  booking: ['inputs', 'suggestions', 'results', 'selection'],
  success: ['inputs', 'suggestions', 'results', 'selection', 'booking'],
};

const WIZARD_SCHEMA = [
  { id: 'origin', label: 'Departure City', question: 'Where are you starting your Odyssey from?', parse: (v: any) => v, confirm: (v: any) => `Starting from ${v}.` },
  { id: 'specificDest', label: 'Destination', question: 'Where in incredible India would you like to explore?', parse: (v: any) => v, confirm: (v: any) => `Destination set to ${v}.` },
  { id: 'startDate', label: 'Travel Date', question: 'When does your journey begin?', parse: (v: any) => v, confirm: (v: any) => `Starting on ${v}.` },
  { id: 'targetBudget', label: 'Budget (₹)', question: 'What is your target investment for this trip?', parse: (v: any) => parseInt(v.replace(/[^0-9]/g, '')), confirm: (v: any) => `Budget set to ₹${v.toLocaleString()}.` },
];

const DEFAULT_INPUTS: PlannerInputs = {
  origin: '',
  specificDest: '',
  startDate: '',
  endDate: '',
  tripType: 'round',
  targetBudget: 50000,
  adults: 1,
  kids: 0,
  kidAges: '',
  dietary: [],
  likes: [],
  dislikes: [],
  destTypes: [],
  ecoFriendly: false,
  wheelchair: false,
  telegramId: '',
  language: 'en',
  budget: 'moderate'
};

// ── Helpers ───────────────────────────────────────────────────────────────
function parsePrice(p?: string | number): number {
  if (!p) return 0;
  if (typeof p === 'number') return p;
  return parseInt(String(p).replace(/[₹,]/g, '')) || 0;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function YatraStudio() {
  const router = useRouter();
  const { setLanguage, language, t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  
  const {
    isOpen: isAIBrainOpen, setOpen: setAIBrainOpen,
    addMessage: addAIMessage, clearHistory: clearAIMessages,
    registerInputUpdateHandler, registerWizardSchema, setWizardMode,
    setPendingOutbound,
  } = useAIBrainStore();

  const {
    activeItinerary, setActiveItinerary,
    searchData, setSearchData,
    mixPicks, setMixPicks,
    plannerStage: stage, setPlannerStage: setStage,
    isProfileOpen, setIsProfileOpen,
    activeBookingId, setActiveBookingId,
    setActivePNR
  } = useTripPlannerStore();

  const {
    setOrigin, setDestination: setGlobalDestination, setDates: setGlobalDates,
    setTargetBudget, setTravelers
  } = useTripStore();

  const { patchTourGuide } = useTourGuideStore();

  const [mounted, setMounted] = useState(false);
  const [inputs, setInputs] = useState<PlannerInputs>(DEFAULT_INPUTS);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [activeLang, setActiveLang] = useState<LanguageCode>(language || 'en');
  const [isSaving, setIsSaving] = useState(false);

  const announcedStages = useRef(new Set<string>());
  const activeBookingIdRef = useRef<string | null>(null);
  const tripConfirmed = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Wizard Sync
  useEffect(() => {
    if (!mounted || authLoading) return;
    registerWizardSchema(WIZARD_SCHEMA);
    registerInputUpdateHandler((id, val) => {
      // 1. Update local form inputs
      setInputs(prev => {
        const next = { ...prev, [id]: val };
        return next;
      });
      // 2. Propagate to TourGuide store so AI context stays in sync
      const fieldMap: Record<string, string> = {
        origin:        'from_city',
        specificDest:  'destination',
        destination:   'destination',
        startDate:     'departure_date',
        endDate:       'return_date',
        targetBudget:  'budget',
        adults:        'party_size',
        kids:          'party_size',
        tripType:      'trip_style',
      };
      const tourGuideField = fieldMap[id];
      if (tourGuideField === 'party_size') {
        const current = useTourGuideStore.getState().party_size || { adults: 1, kids: 0 };
        const updated = id === 'adults'
          ? { ...current, adults: Number(val) }
          : { ...current, kids: Number(val) };
        patchTourGuide({ party_size: updated });
      } else if (tourGuideField) {
        patchTourGuide({ [tourGuideField]: val } as any);
      }
      // 3. Propagate to global TripStore
      if (id === 'origin')       setOrigin(String(val));
      if (id === 'specificDest' || id === 'destination') setGlobalDestination(String(val));
      if (id === 'startDate')    setGlobalDates(String(val), useTripStore.getState().endDate || '');
      if (id === 'endDate')      setGlobalDates(useTripStore.getState().startDate || '', String(val));
      if (id === 'targetBudget') setTargetBudget(Number(val));
      if (id === 'adults')       setTravelers(Number(val), useTripStore.getState().kids || 0);
    });
    return () => {
      registerWizardSchema([]);
      registerInputUpdateHandler(null);
    };
  }, [mounted, authLoading, registerWizardSchema, registerInputUpdateHandler]);

  // Global Store Sync
  useEffect(() => {
    if (!mounted) return;
    setGlobalDestination(inputs.specificDest);
    setOrigin(inputs.origin);
    setGlobalDates(inputs.startDate, inputs.endDate || inputs.startDate);
    setTargetBudget(inputs.targetBudget);
    setTravelers(inputs.adults, inputs.kids);
    patchTourGuide({
      from_city: inputs.origin,
      destination: inputs.specificDest,
      budget: inputs.targetBudget,
      party_size: { adults: inputs.adults, kids: inputs.kids },
      planner_stage: stage
    });
  }, [inputs, stage, mounted, setGlobalDestination, setOrigin, setGlobalDates, setTargetBudget, setTravelers, patchTourGuide]);

  // Supabase Tour Guide Session Sync (debounced 2s)
  useEffect(() => {
    if (!mounted || !user?.id) return;
    const timer = setTimeout(async () => {
      try {
        const tg = useTourGuideStore.getState();
        const { storeLikes, storeDislikes, storePersona } = {
          storeLikes: useTripStore.getState().likes,
          storeDislikes: useTripStore.getState().dislikes,
          storePersona: useTripStore.getState().userPersona,
        };
        await supabase.from('yatra_tour_guide_sessions').upsert({
          user_id: user.id,
          language: tg.language || 'en',
          from_city: tg.from_city || inputs.origin || '',
          destination: tg.destination || inputs.specificDest || '',
          departure_date: tg.departure_date || inputs.startDate || null,
          return_date: tg.return_date || inputs.endDate || null,
          budget: String(tg.budget || inputs.targetBudget || 0),
          party_size: tg.party_size,
          preferences: tg.preferences || [],
          features: tg.features || [],
          trip_style: tg.trip_style || inputs.tripType || 'leisure',
          planner_stage: stage,
          mix_picks: mixPicks,
          discovered_tours: tg.discovered_tours || [],
          selected_tour: tg.selected_tour || null,
          conversation_summary: tg.conversation_summary || '',
          // New fields from this session
          user_persona: storePersona || null,
          likes: storeLikes || [],
          dislikes: storeDislikes || [],
          hotel_name: mixPicks.hotel?.name || null,
          hotel_selected_at: mixPicks.hotel ? new Date().toISOString() : null,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'user_id', ignoreDuplicates: false });
      } catch (e) {
        console.warn('[Planner] Session sync failed:', e);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    mounted, user?.id,
    inputs.origin, inputs.specificDest, inputs.startDate, inputs.endDate,
    inputs.targetBudget, inputs.adults, inputs.kids, inputs.tripType,
    stage, mixPicks.hotel?.name, mixPicks.transport?.name,
  ]);

  // Auto-Save Effect
  useEffect(() => {
    if (!activeItinerary || (stage !== 'booking' && stage !== 'success')) return;
    const save = async () => {
      setIsSaving(true);
      try {
        await fetch('/api/trips/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activeItinerary, user_id: user?.id })
        });
      } catch (e) { console.error('Save failed', e); }
      finally { setIsSaving(false); }
    };
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [activeItinerary, stage, user]);

  const handleReset = () => {
    setStage('inputs');
    setPlan(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setMixPicks({ transport: null, returnTransport: null, hotel: null, local: null });
    setActiveItinerary(null);
    setActiveBookingId(null);
    activeBookingIdRef.current = null;
    tripConfirmed.current = false;
  };

  const handleGetSuggestions = async () => {
    if (!inputs.origin || !inputs.startDate) {
      toast.error('Missing details', { description: 'Please provide origin and start date.' });
      return;
    }
    setStage('planning');
    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const data = await res.json();
      console.log('[Discovery] API response:', data);
      const fetched = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (fetched.length === 0) {
        const _nights = inputs.startDate && inputs.endDate
          ? Math.max(1, Math.ceil((new Date(inputs.endDate).getTime() - new Date(inputs.startDate).getTime()) / 86400000))
          : 3;
        setSuggestions([
          { title: 'Goa', destination: 'Goa', vibe: 'Beaches & Nightlife', why: "Sun, sand and sea — India's party capital.", totalPrice: 8500, flight_cost: '₹3,500', train_cost: '₹1,200', bus_cost: '₹800', hotel_cost: '₹3,500', tags: ['Beach', 'Nightlife'], safety_score: 8, weather_summary: 'Sunny', nights: _nights },
          { title: 'Jaipur', destination: 'Jaipur', vibe: 'Heritage & Culture', why: 'The Pink City — palaces, forts and royal cuisine.', totalPrice: 9000, flight_cost: '₹4,000', train_cost: '₹1,500', bus_cost: '₹900', hotel_cost: '₹3,500', tags: ['Heritage', 'Culture'], safety_score: 8, weather_summary: 'Warm', nights: _nights },
          { title: 'Manali', destination: 'Manali', vibe: 'Mountains & Adventure', why: 'Snow peaks and adventure sports in the Himalayas.', totalPrice: 10000, flight_cost: '₹5,000', train_cost: '₹2,000', bus_cost: '₹1,200', hotel_cost: '₹3,800', tags: ['Mountains', 'Adventure'], safety_score: 7, weather_summary: 'Cold', nights: _nights },
          { title: 'Kerala', destination: 'Kerala', vibe: 'Nature & Wellness', why: 'Backwaters, ayurveda and lush greenery await.', totalPrice: 11000, flight_cost: '₹4,500', train_cost: '₹1,800', bus_cost: '₹1,000', hotel_cost: '₹4,500', tags: ['Nature', 'Wellness'], safety_score: 9, weather_summary: 'Tropical', nights: _nights },
        ]);
        toast.info('Using curated suggestions', { description: 'Live AI data syncing — showing popular options.' });
      } else {
        setSuggestions(fetched);
      }
      setStage('suggestions');
    } catch (e) {
      console.error('[Discovery] fetch error:', e);
      toast.error('Discovery failed');
      setStage('inputs');
    }
  };

  const fetchSearchData = async (dest: string, fallbackSuggestion?: any) => {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: dest,
          origin: inputs.origin,
          startDate: inputs.startDate,
          endDate: inputs.endDate || inputs.startDate,
          adults: inputs.adults,
          kids: inputs.kids
        })
      });
      const data = await res.json();
      
      const transportSeeds = supplementTransportForDestination(dest, dest);

      // Merge with synthetic fallbacks if live data is empty
      const finalData = {
        flights: data.flights?.length > 0 ? data.flights : [
          { id: 'fb-flight-1', airline: 'IndiGo', airlineCode: '6E', flight: '6E-123', from: inputs.origin, to: inputs.specificDest, departure: '06:00', arrival: '08:15', duration: '2h 15m', stops: 'Non-stop', price: fallbackSuggestion?.flight_cost && fallbackSuggestion.flight_cost !== 'N/A' ? fallbackSuggestion.flight_cost : '₹3,400', cabin: 'Economy', baggage: '15kg', seats: 6, date: inputs.startDate, type: 'Flight' },
          { id: 'fb-flight-2', airline: 'Air India', airlineCode: 'AI', flight: 'AI-456', from: inputs.origin, to: inputs.specificDest, departure: '09:30', arrival: '11:50', duration: '2h 20m', stops: 'Non-stop', price: '₹4,800', cabin: 'Economy', baggage: '25kg', seats: 4, date: inputs.startDate, type: 'Flight' },
          { id: 'fb-flight-3', airline: 'SpiceJet', airlineCode: 'SG', flight: 'SG-789', from: inputs.origin, to: inputs.specificDest, departure: '12:00', arrival: '14:30', duration: '2h 30m', stops: 'Non-stop', price: '₹3,100', cabin: 'Economy', baggage: '15kg', seats: 8, date: inputs.startDate, type: 'Flight' },
          { id: 'fb-flight-4', airline: 'Vistara', airlineCode: 'UK', flight: 'UK-202', from: inputs.origin, to: inputs.specificDest, departure: '15:00', arrival: '17:20', duration: '2h 20m', stops: 'Non-stop', price: '₹5,500', cabin: 'Economy', baggage: '20kg', seats: 3, date: inputs.startDate, type: 'Flight' },
          { id: 'fb-flight-5', airline: 'Air India Express', airlineCode: 'IX', flight: 'IX-344', from: inputs.origin, to: inputs.specificDest, departure: '17:45', arrival: '20:15', duration: '2h 30m', stops: '1 Stop', price: '₹2,900', cabin: 'Economy', baggage: '15kg', seats: 10, date: inputs.startDate, type: 'Flight' },
          { id: 'fb-flight-6', airline: 'Akasa Air', airlineCode: 'QP', flight: 'QP-512', from: inputs.origin, to: inputs.specificDest, departure: '20:30', arrival: '22:50', duration: '2h 20m', stops: 'Non-stop', price: '₹3,700', cabin: 'Economy', baggage: '15kg', seats: 5, date: inputs.startDate, type: 'Flight' },
        ],
        hotels: mergeApiHotelsWithCuratedSeeds(data.hotels, dest),
        trains: data.trains?.length > 0 
          ? data.trains 
          : [...(transportSeeds.filter(s => s.type === 'Train')), {
              id: 'fallback-train-1',
              name: fallbackSuggestion?.train_name || 'Express Rail (3A/2A)',
              class: '3A/2A',
              price: fallbackSuggestion?.train_cost || '₹1,800',
              type: 'Train'
            }],
        buses: data.buses?.length > 0 
          ? data.buses 
          : [...(transportSeeds.filter(s => s.type === 'Bus')), {
              id: 'fallback-bus-1',
              operator: fallbackSuggestion?.bus_operator || 'Premium AC Sleeper',
              departure: '21:00',
              arrival: '06:00',
              price: fallbackSuggestion?.bus_cost || '₹1,200',
              type: 'Bus'
            }],
        taxis: data.taxis || [],
        ferries: data.ferries?.length > 0 
          ? data.ferries 
          : supplementFerriesForDestination(dest, dest)
      };

      setSearchData(finalData);
      
      // Auto-pick first options from merged data
      if (finalData.hotels.length > 0) setMixPicks({ hotel: finalData.hotels[0] });
      if (finalData.flights.length > 0) setMixPicks({ transport: { ...finalData.flights[0], type: 'Flight' } });
      else if (finalData.trains.length > 0) setMixPicks({ transport: { ...finalData.trains[0], type: 'Train' } });
      else if (finalData.buses.length > 0) setMixPicks({ transport: { ...finalData.buses[0], type: 'Bus' } });
    } catch (e) { console.error('Search failed', e); }
  };

  const handleGeneratePlan = async (suggestion?: any, destOverride?: string, mode?: string) => {
    const targetDest = destOverride || suggestion?.destination || suggestion?.title || inputs.specificDest;
    
    if (!targetDest) {
      toast.error('Drafting failed', { description: 'No destination selected for drafting.' });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a detailed day-by-day itinerary for ${targetDest} for ${inputs.adults} adults and ${inputs.kids} kids. 
          The budget is ₹${inputs.targetBudget}. Use a ${inputs.budget || 'standard'} tone.
          
          STRICT RULES:
          1. Return ONLY a raw JSON object. 
          2. NO markdown formatting, NO backticks, NO conversational text.
          3. Start the response with { and end with }.
          
          Format:
          {
            "destination": "${targetDest}",
            "totalEstimate": "₹X",
            "dayPlan": [
              { "day": 1, "title": "...", "activities": ["...", "..."] }
            ]
          }`,
          suggestion,
          mode
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API failed');

      let rawPlan;
      if (typeof data.response === 'string') {
        try {
          // Find the first { or [ and last } or ]
          const start = Math.min(
            data.response.indexOf('{') === -1 ? Infinity : data.response.indexOf('{'),
            data.response.indexOf('[') === -1 ? Infinity : data.response.indexOf('[')
          );
          const end = Math.max(
            data.response.lastIndexOf('}'),
            data.response.lastIndexOf(']')
          );
          
          if (start !== Infinity && end !== -1 && end > start) {
            const cleanJson = data.response.substring(start, end + 1);
            rawPlan = JSON.parse(cleanJson);
          } else {
            // Last ditch effort: try to find anything that looks like JSON
            const match = data.response.match(/[\{\[](.|[\r\n])*[\}\]]/);
            if (match) {
              rawPlan = JSON.parse(match[0]);
            } else {
              rawPlan = JSON.parse(data.response.replace(/```json|```/g, '').trim());
            }
          }
        } catch (e) {
          console.error('JSON Parse failed, trying direct fallback', e);
          rawPlan = data.response; 
        }
      } else {
        rawPlan = data.response;
      }
      
      if (!rawPlan) throw new Error('No plan received');

      // Robust mapping
      const rawDayPlan = rawPlan.dayPlan || rawPlan.itinerary || rawPlan.plan || [];
      const sanitizedDayPlan = Array.isArray(rawDayPlan) ? rawDayPlan.map((d: any, idx: number) => ({
        day: d.day || idx + 1,
        title: d.title || d.activity || d.label || `Day ${idx + 1}`,
        activities: Array.isArray(d.activities) ? d.activities : [typeof d.activity === 'string' ? d.activity : 'Explore the local charm']
      })) : [];

      const finalPlan = {
        ...rawPlan,
        dayPlan: sanitizedDayPlan,
        destination: targetDest,
        to: targetDest,
        from: inputs.origin,
        startDate: inputs.startDate || null,
        endDate: inputs.endDate || inputs.startDate || null,
        totalEstimate: rawPlan.totalEstimate || rawPlan.budget || `₹${inputs.targetBudget.toLocaleString()}`,
        totalNum: rawPlan.totalNum || inputs.targetBudget
      };

      const { setDestination } = useTripStore.getState();
      setDestination(targetDest);

      setPlan(finalPlan);
      setActiveItinerary(finalPlan);
      // Sync dates to tour guide store so StepSuccess fallback also resolves
      patchTourGuide({
        departure_date: inputs.startDate || null,
        return_date: inputs.endDate || inputs.startDate || null,
      });
      setStage('results');
      
      // Auto-save this odyssey draft
      if (user) {
        fetch('/api/trips/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: inputs.origin,
            destination: targetDest,
            startDate: inputs.startDate,
            endDate: inputs.endDate || inputs.startDate,
            nights: finalPlan.nights || 1,
            tierLabel: finalPlan.tierLabel || 'Odyssey',
            total: finalPlan.totalEstimate || '₹0',
            totalPrice: finalPlan.totalNum || 0,
            transport: finalPlan.transport || {},
            hotel: finalPlan.hotel || {},
            local: finalPlan.local || {},
            fullPlan: finalPlan,
            status: 'saved'
          })
        }).catch(err => console.error('Auto-save failed:', err));
      }
      
      // Trigger live hotel/transport search with suggestion fallback
      fetchSearchData(targetDest, suggestion);
      
    } catch (e: any) {
      console.error('Drafting error:', e);
      toast.error('Drafting failed', { description: e.message || 'The AI engine encountered a snag.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBookAndPay = async (passengers: any[] | null) => {
    const travelers = (inputs.adults || 1) + (inputs.kids || 0);
    const nights = activeItinerary?.nights || 1;
    const tp = parsePrice(mixPicks.transport?.price);
    const hp = parsePrice(mixPicks.hotel?.price);
    const total = (tp * travelers) + (hp * nights);

    const pnr = 'YA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setActivePNR(pnr);
    
    // Save to DB
    if (user) {
      const bookingData = {
        user_id: user.id,
        booking_type: 'TRIP',
        pnr,
        status: 'confirmed',
        total_amount: Math.round(total),
        trip_data: {
          ...activeItinerary,
          mixPicks
        },
        passengers: passengers || []
      };

      const tripPlanData = {
        user_id: user.id,
        origin: inputs.origin || '',
        destination: activeItinerary?.destination || '',
        start_date: inputs.startDate || null,
        end_date: inputs.endDate || null,
        nights: activeItinerary?.nights || 1,
        tier_label: activeItinerary?.tierLabel || 'Custom',
        total_estimate: activeItinerary?.totalEstimate || `₹${total.toLocaleString()}`,
        total_amount: total,
        transport: mixPicks.transport || {},
        hotel: mixPicks.hotel || {},
        local_transport: mixPicks.local || {},
        full_plan: activeItinerary || {},
        status: 'saved'
      };

      const [bookingRes, tripRes] = await Promise.all([
        supabase.from('yatra_bookings').insert(bookingData),
        supabase.from('yatra_trip_plans').insert(tripPlanData)
      ]);

      if (bookingRes.error || tripRes.error) {
        console.error('Booking save error:', bookingRes.error || tripRes.error);
        toast.error('Partial save failure', { description: (bookingRes.error || tripRes.error)?.message });
      }
    }

    setStage('success');
  };

  if (!mounted || authLoading) return null;

  const indicatorSteps = WIZARD_STEPS.map(s => ({ ...s, label: s.label }));
  const currentStepId = stage === 'planning' ? 'suggestions' : stage;
  const doneSteps = DONE_MAP[stage] || [];

  return (
    <div className="planner-bg min-h-screen pb-20">
      <NavigationWrapper
        onBack={
          stage === 'inputs'      ? undefined :
          stage === 'suggestions' ? () => setStage('inputs') :
          stage === 'planning'    ? () => setStage('inputs') :
          stage === 'results'     ? () => setStage('suggestions') :
          stage === 'selection'   ? () => setStage('results') :
          stage === 'booking'     ? () => setStage('selection') :
          undefined
        }
        onNext={
          stage === 'inputs'      ? handleGetSuggestions :
          stage === 'results'     ? () => setStage('selection') :
          stage === 'selection'   ? () => setStage('booking') :
          stage === 'booking'     ? () => handleBookAndPay(null) :
          undefined
        }
        nextLabel={
          stage === 'inputs'    ? 'Generate Plan' :
          stage === 'results'   ? 'View in Cart' :
          stage === 'selection' ? 'Proceed to Booking' :
          stage === 'booking'   ? 'Confirm & Pay' :
          ''
        }
        disabledNext={
          stage === 'inputs' ? (!inputs.origin || !inputs.specificDest || !inputs.startDate || isGenerating) :
          stage === 'booking' ? isSaving :
          false
        }
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 md:pt-8">
          <header className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter">
              <span className="text-saffron">YA</span>TRA <span className="text-green">STUDIO</span>
            </h1>
          </header>

          <StepIndicator steps={indicatorSteps} current={currentStepId} done={doneSteps} />
          <AnimatePresence mode="wait">
            {stage === 'inputs' && (
              <StepInputs 
                key="inputs" 
                inputs={inputs} 
                setInputs={setInputs} 
                onDiscover={handleGetSuggestions} 
                activeLang={activeLang}
                setActiveLang={setActiveLang}
                patchTourGuide={patchTourGuide}
              />
            )}
            {stage === 'planning' && <StepPlanning key="planning" />}
            {stage === 'suggestions' && (
              <StepSuggestions 
                key="suggestions" suggestions={suggestions} inputs={inputs} 
                onConfirm={(s, d, m) => handleGeneratePlan(s, d, m)}
                onBack={() => setStage('inputs')} onReset={handleReset}
                onGenerate={() => handleGeneratePlan()} isLoading={isGenerating}
                fetchedInputs={null} selectedIdx={null} setInputs={setInputs} 
                onAskAI={(suggestion) => {
                  setAIBrainOpen(true);
                  setPendingOutbound({
                    text: `Analyze this ${suggestion.title} Odyssey for me. Destination: ${suggestion.destination}, Vibe: ${suggestion.vibe}, Total: ${suggestion.totalPrice}. Is it good for my budget?`,
                    destinationBriefFormat: true
                  });
                }}
              />
            )}
            
            {stage === 'results' && activeItinerary && (
              <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="shell-panel p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-white border-orange-100 shadow-2xl rounded-[2rem] sm:rounded-[3rem]">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-saffron" />
                        <span className="text-[10px] font-black text-saffron uppercase tracking-widest">Odyssey Drafted</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#000080] uppercase italic leading-none">{activeItinerary.destination}</h2>
                      <p className="text-sm font-bold text-slate-400">Valuation: {activeItinerary.totalEstimate}</p>
                    </div>
                    <button onClick={handleReset} className="p-3 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-all">
                      <RotateCcw className="w-5 h-5 text-saffron" />
                    </button>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Planned Odyssey</h3>
                    <div className="space-y-6">
                      {(activeItinerary.dayPlan || []).map((day: any, i: number) => (
                        <div key={i} className="relative pl-8 border-l-2 border-orange-100/50 pb-4">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-saffron shadow-sm" />
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-[#000080] uppercase italic">{day.title}</h4>
                            <ul className="space-y-1">
                              {day.activities.map((act: any, idx: number) => (
                                <li key={idx} className="text-[12px] text-slate-600 font-medium flex items-center gap-2">
                                  <div className="w-1 h-1 bg-saffron rounded-full" /> {typeof act === 'string' ? act : (act.activity || act.title || act.description || act.label || 'Explore')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setStage('selection')}
                    className="w-full py-4 sm:py-6 bg-gradient-to-r from-saffron to-orange-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:shadow-saffron/30 transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
                  >
                    View in Cart <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {stage === 'selection' && activeItinerary && (
              <StepSelection 
                key="selection" 
                onConfirm={() => setStage('booking')} 
                onBack={() => setStage('results')} 
                onUpdateParams={() => fetchSearchData(activeItinerary.destination, activeItinerary)}
              />
            )}
            {stage === 'booking' && <StepBooking key="booking" searchData={searchData} setInputs={setInputs} nights={activeItinerary?.nights || 1} onBack={() => setStage('selection')} onBookAndPay={handleBookAndPay} />}
            {stage === 'success' && (
              <StepSuccess 
                key="success" 
                from_city={inputs.origin} 
                destination={inputs.specificDest} 
                onReset={handleReset} 
              />
            )}
          </AnimatePresence>
        </div>
      </NavigationWrapper>
    </div>
  );
}
