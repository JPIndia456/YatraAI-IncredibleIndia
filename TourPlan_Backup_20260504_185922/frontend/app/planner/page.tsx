'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, MessageSquare, ShieldCheck, Send,
  Mic, RotateCcw, Train, Plane, MapPin,
  Thermometer, Wallet, BrainCircuit, PartyPopper, Utensils,
  ShoppingBag, Moon,
  Plus, Globe, Volume2, VolumeX,
  Calendar, Navigation, CheckCircle2, Hotel, Car, Ship
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NavigationWrapper from '@/components/layout/NavigationWrapper';
import { useTripStore, useAIBrainStore, useTripPlannerStore, useTourGuideStore, WizardField } from '@/lib/store';
import { parsePhone } from '@/lib/wizardParsers';
import { getPlannerWizardSchema } from '@/lib/wizardSchema';
import { parseAiItineraryJson } from '@/lib/parseAiItineraryJson';
import { supabase } from '@/lib/supabase/client';
import TripPlanner from '@/components/TripPlanner';
import AIBrain from '@/components/AIBrain';
import { speakIndianText } from '@/lib/bhashini';
import { useLanguage } from '@/contexts/LanguageContext';

// Step components
import StepInputs, { PlannerInputs, Language } from '@/components/planner/StepInputs';
import StepSuggestions from '@/components/planner/StepSuggestions';
import StepPlanning from '@/components/planner/StepPlanning';
import StepBooking from '@/components/planner/StepBooking';
import StepIndicator from '@/components/planner/StepIndicator';
import StepSelection from '@/components/planner/StepSelection';
import StepSuccess from '@/components/planner/StepSuccess';

// ── Types ───────────────────────────────────────────────────────────────────
type Stage = 'inputs' | 'suggestions' | 'planning' | 'results' | 'selection' | 'booking' | 'success';

/** Next calendar day (UTC-safe) for single-trip hotel/checkout style ranges. */
function addDaysToIsoDate(iso: string, days: number): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

interface GeneratedPlan {
  destination: string; duration: string; bestTime: string;
  weather: { temp: string; condition: string; rain: string; humidity: string };
  festivals: Array<{ name: string; date: string; desc: string }>;
  hotels: Array<{ name: string; tier: string; price: string; rating: string; highlights: string }>;
  transport: Array<{ mode: string; from: string; detail: string; price: string; duration: string }>;
  foodSpots: Array<{ name: string; cuisine: string; type: string; must: string }>;
  shopping: Array<{ market: string; specialty: string; timing: string; tip: string }>;
  highlights: string[];
  safety: { vaccines: string[]; tips: string[]; emergency: Array<{ label: string; number: string }>; dos: string[]; donts: string[] };
  dayPlan: Array<{ day: number; date: string; title: string; activities: Array<{ time: string; activity: string; icon: string; cost?: string; kidFriendly?: boolean }> }>;
  /** Some AI responses use `itinerary` instead of `dayPlan`; normalize below. */
  itinerary?: GeneratedPlan['dayPlan'];
  totalEstimate: string;
}

const WIZARD_STEPS = [
  { id: 'inputs',      label: 'Details' },
  { id: 'suggestions', label: 'Options' },
  { id: 'results',     label: 'Itinerary' },
  { id: 'selection',   label: 'Selection Studio' },
  { id: 'booking',     label: 'Book' },
  { id: 'success',     label: 'Complete' },
];

const DONE_MAP: Record<Stage, string[]> = {
  inputs:      [],
  planning:    ['inputs'],
  suggestions: ['inputs'],
  results:     ['inputs', 'suggestions'],
  selection:   ['inputs', 'suggestions', 'results'],
  booking:     ['inputs', 'suggestions', 'results', 'selection'],
  success:     ['inputs', 'suggestions', 'results', 'selection', 'booking'],
};

/** Single source of truth for wizard defaults — must match handleReset / fresh planner UX */
const INITIAL_PLANNER_INPUTS: PlannerInputs = {
  startDate: '',
  endDate: '',
  dietary: ['veg'],
  adults: 2,
  kids: 0,
  kidAges: '',
  budget: 'economy',
  destTypes: [],
  language: 'en',
  specificDest: '',
  origin: '',
  tripType: 'round',
  targetBudget: 10000,
  ecoFriendly: false,
  wheelchair: false,
  telegramId: '',
};

// ── Component ───────────────────────────────────────────────────────────────
export default function TourPlanStudio() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    isOpen: isAIBrainOpen, setOpen: setAIBrainOpen,
    addMessage: addAIMessage, clearHistory: clearAIMessages,
    registerInputUpdateHandler, registerWizardSchema, setWizardMode,
    setPendingOutbound,
  } = useAIBrainStore();
  const { activeItinerary, setActiveItinerary, setActiveStep, searchData } = useTripPlannerStore();
  const {
    setDestination: setGlobalDestination, setDates: setGlobalDates,
    setOrigin, setTargetBudget, setTravelers, setBudget, setTravelType,
  } = useTripStore();
  const { patchTourGuide, resetTourGuide } = useTourGuideStore();

  const [mounted, setMounted]   = useState(false);
  const stage = useTripPlannerStore(state => state.plannerStage);
  const { activeItinerary: activeItineraryStore, plannerStage } = useTripPlannerStore();
  const [isSaving, setIsSaving] = useState(false);
  const setStage = useTripPlannerStore(state => state.setPlannerStage);

  // Auto-save effect
  useEffect(() => {
    if (!activeItineraryStore || (plannerStage !== 'selection' && plannerStage !== 'booking' && plannerStage !== 'success')) return;
    
    const savePlan = async () => {
      setIsSaving(true);
      try {
        await fetch('/api/trips/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activeItineraryStore,
            totalNum: activeItineraryStore.totalNum,
            fullPlan: activeItineraryStore.dayPlan
          })
        });
      } catch (e) {
        console.error('Auto-save failed', e);
      } finally {
        setIsSaving(false);
      }
    };

    const timer = setTimeout(savePlan, 2000);
    return () => clearTimeout(timer);
  }, [activeItineraryStore, plannerStage]);

  // Sync local UI stage with Tour Guide state
  useEffect(() => {
    patchTourGuide({ planner_stage: stage });
  }, [stage, patchTourGuide]);

  const [activeLang, setActiveLang] = useState<Language>('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan]         = useState<GeneratedPlan | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [fetchedInputs, setFetchedInputs] = useState<{ adults: number; kids: number } | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [awaitingRazorpayOnSuccess, setAwaitingRazorpayOnSuccess] = useState(false);
  const activeBookingIdRef = useRef<string | null>(null);
  const paymentMethodRef = useRef<'riya' | 'razorpay' | 'direct'>('direct');

  function handleReset() {
    setAwaitingRazorpayOnSuccess(false);
    if (announcedStages.current) announcedStages.current.clear();
    tripConfirmed.current = false;
    useTripPlannerStore.getState().clearPlan();
    setInputs({ ...INITIAL_PLANNER_INPUTS });
    setActiveLang(INITIAL_PLANNER_INPUTS.language);
    setGlobalDestination('');
    setPlan(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
    setFetchedInputs(null);
    setActiveBookingId(null);
    
    // Comprehensive Reset
    useTripStore.getState().resetTrip();
    useTripPlannerStore.getState().clearPlan();
    useTourGuideStore.getState().resetTourGuide();
    clearAIMessages();
    
    setAIBrainOpen(false);
    setWizardMode(false);
    setStage('inputs');
  }

  const [inputs, setInputs] = useState<PlannerInputs>(() => ({ ...INITIAL_PLANNER_INPUTS }));

  const effectiveEndDate = useMemo(() => {
    if (inputs.tripType === 'round') return inputs.endDate;
    if (!inputs.startDate) return '';
    return addDaysToIsoDate(inputs.startDate, 1);
  }, [inputs.tripType, inputs.startDate, inputs.endDate]);

  // ── Session Auto-Save ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !mounted) return;

    const sync = async () => {
      const state = useTourGuideStore.getState();
      const { error } = await supabase
        .from('tourplan_tour_guide_sessions')
        .upsert({
          user_id: user.id,
          language: state.language,
          from_city: state.from_city,
          destination: state.destination,
          departure_date: state.departure_date,
          return_date: state.return_date,
          budget: state.budget,
          party_size: state.party_size,
          preferences: state.preferences,
          features: state.features,
          trip_style: state.trip_style,
          constraints: state.constraints,
          planner_stage: state.planner_stage,
          mix_picks: state.mix_picks,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }); // Assuming 1 active session per user for now

      if (error) {
        console.error('Session Sync Error:', error.message, error.details, error.hint);
      }
    };

    const timer = setTimeout(sync, 2000);
    return () => clearTimeout(timer);
  }, [user, mounted, stage, inputs]);

  useEffect(() => {
    if (mounted) {
      const stageNow = useTripPlannerStore.getState().plannerStage;
      const hasPlan = useTripPlannerStore.getState().activeItinerary;
      if (stageNow === 'inputs' && !hasPlan) {
        handleReset();
      }
    }
  }, [mounted]);

  const announcedStages = useRef<Set<string>>(new Set());
  const tripConfirmed   = useRef(false);
  /** Tracks which user id we've applied the post-auth planner init for (handles account switch). */
  const plannerSessionUidRef = useRef<string | null>(null);

  useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);

  // ── Start clean once per logged-in user id (no resume popup) ────────────
  // Avoid calling handleReset when auth finishes *after* the user has already moved past Details —
  // otherwise the wizard flashes back to inputs during Options → Itinerary transitions.
  // Always reset when switching accounts so the prior user's trip state never leaks through.
  useEffect(() => {
    if (!mounted || authLoading) return;
    const uid = user?.id ?? null;
    if (!uid) {
      plannerSessionUidRef.current = null;
      return;
    }

    const prevAttached = plannerSessionUidRef.current;
    const switchedAccount = prevAttached !== null && prevAttached !== uid;

    // 1. If same user and we are ALREADY past inputs, DO NOT RESET.
    // This prevents the 'flicker' during generate -> results transitions.
    const stageNow = useTripPlannerStore.getState().plannerStage;
    if (!switchedAccount && stageNow !== 'inputs') {
      plannerSessionUidRef.current = uid;
      return;
    }

    // 2. If same user and we are at inputs, we only reset if it's the very first run
    if (!switchedAccount && prevAttached === uid) return;

    plannerSessionUidRef.current = uid;
    handleReset();
  }, [mounted, authLoading, user?.id]);
  // Refactor: Move global sync logic to a stable handler to avoid React render-update loops
  const syncGlobalStore = (field: string, value: any) => {
    const valStr = String(value);
    const valNum = Number(value);
    
    // CRITICAL: If we are already past the inputs stage (e.g. in selection or success),
    // we should NOT trigger a full reset of the planner just because the AI Brain 
    // is syncing its understood destination/dates. 
    // We only allow these to trigger resets if we are still in the 'inputs' stage.
    const canTriggerReset = stage === 'inputs' || stage === 'suggestions';

    if (field === 'specificDest') {
      if (canTriggerReset) {
        setGlobalDestination(valStr);
      } else {
        // Just sync the Tour Guide store without resetting the planner
        patchTourGuide({ destination: valStr });
      }
    } else if (field === 'origin') {
      if (canTriggerReset) {
        setOrigin(valStr);
      }
      patchTourGuide({ from_city: valStr });
    } else if (field === 'startDate') {
      patchTourGuide({ departure_date: valStr });
    } else if (field === 'endDate') {
      if (canTriggerReset && inputs.startDate) {
        setGlobalDates(inputs.startDate, valStr);
      }
      patchTourGuide({ return_date: valStr });
    } else if (field === 'targetBudget') {
      if (canTriggerReset) {
        setTargetBudget(valNum);
      }
      patchTourGuide({ budget: valNum });
    } else if (field === 'adults') {
      if (canTriggerReset) {
        setTravelers(valNum, inputs.kids);
      }
      patchTourGuide({ party_size: { adults: valNum, kids: inputs.kids } });
    } else if (field === 'dietary') {
      patchTourGuide({ constraints: `Dietary requirements: ${Array.isArray(value) ? value.join(', ') : value}` });
    } else if (field === 'ecoFriendly') {
      patchTourGuide({ features: value ? ['sustainable'] : [] });
    } else if (field === 'wheelchair') {
      patchTourGuide({ constraints: value ? 'Need Accessibility.' : '' });
    } else if (field === 'telegramId') {
      patchTourGuide({ telegramId: valStr.trim().replace(/^@/, '') });
    }
  };

  useEffect(() => {
    if (!mounted || authLoading) return;

    const schema = getPlannerWizardSchema();

    registerWizardSchema(schema);
    registerInputUpdateHandler((id, val) => {
      if (id === 'hotelTier') {
        useTripPlannerStore.getState().setHotelTier(val as any);
      }
      if (id === 'dietary') {
        setInputs(prev => ({ ...prev, dietary: [val as any] }));
      } else {
        setInputs(prev => ({ ...prev, [id]: val }));
      }
    });

    // Initial state: AI Brain is ready but not forcing questions
    if (!inputs.specificDest && !inputs.origin && !inputs.startDate) {
      setWizardMode(false); // Let the AIBrain's own greeting handle the intro
      setAIBrainOpen(true);
    }

    return () => {
      registerInputUpdateHandler(null);
      registerWizardSchema([]);
      setWizardMode(false);
    };
  }, [mounted, authLoading]);

  // Master Sync: Push Page State to AI Brain whenever inputs change
  useEffect(() => {
    if (!mounted) return;
    patchTourGuide({
      from_city: inputs.origin,
      destination: inputs.specificDest,
      trip_style: inputs.tripType === 'round' ? 'round-trip' : 'single-trip',
      departure_date: inputs.startDate,
      return_date: inputs.tripType === 'round' ? inputs.endDate : '',
      budget: inputs.targetBudget,
      party_size: { adults: inputs.adults, kids: inputs.kids },
      preferences: inputs.destTypes as any[],
      constraints: [
        inputs.dietary.length > 0 ? `Dietary: ${inputs.dietary.join(', ')}` : '',
        inputs.wheelchair ? 'Need Accessibility.' : '',
      ].filter(Boolean).join('. '),
      features: [
        inputs.ecoFriendly ? 'sustainable' : '',
      ].filter(Boolean) as any[],
    });
    // Sync to legacy stores
    if (inputs.specificDest) setGlobalDestination(inputs.specificDest);
    if (inputs.origin) setOrigin(inputs.origin);
    if (inputs.startDate) {
      if (inputs.tripType === 'round' && inputs.endDate) {
        setGlobalDates(inputs.startDate, inputs.endDate);
      } else if (inputs.tripType === 'single' && effectiveEndDate) {
        setGlobalDates(inputs.startDate, effectiveEndDate);
      }
    }
    if (inputs.targetBudget) setTargetBudget(inputs.targetBudget);
    setTravelers(inputs.adults, inputs.kids);
    
    // Explicitly update planner stage on input changes if we are in inputs
    if (stage === 'inputs') patchTourGuide({ planner_stage: 'inputs' });
  }, [inputs, effectiveEndDate, mounted, patchTourGuide, stage]);

  // Telegram: never clear store from empty inputs (booking-step Connect only updates store first).
  useEffect(() => {
    if (!mounted) return;
    const v = inputs.telegramId.trim().replace(/^@/, '').trim();
    if (v.length >= 3) patchTourGuide({ telegramId: v });
  }, [inputs.telegramId, mounted, patchTourGuide]);

  useEffect(() => { patchTourGuide({ language: activeLang }); }, [activeLang]);

  // ── Stage-driven AI Brain messages ────────────────────────────────────────
  useEffect(() => {
    if (!mounted || authLoading) return;
    const fire = (key: string, msg: string, delay = 1000) => {
      if (announcedStages.current.has(key)) return;
      announcedStages.current.add(key);
      setTimeout(() => { setAIBrainOpen(true); addAIMessage({ role: 'assistant', content: msg }); }, delay);
    };
    if (stage === 'suggestions' && suggestions.length > 0 && !tripConfirmed.current)
      fire('suggestions', `Found ${suggestions.length} premium options! Which vibe fits you best?`, 1500);
    else if (stage === 'planning')
      fire('planning', `Building your itinerary now…`, 500);
    else if (stage === 'results' && plan) {
      tripConfirmed.current = true;
      const summary = `✅ **Odyssey Summary**\n\n` +
        `• **Destination**: ${plan.destination}\n` +
        `• **Origin**: ${inputs.origin || 'India'}\n` +
        `• **Dates**: ${inputs.startDate}${inputs.tripType === 'round' && inputs.endDate ? ` to ${inputs.endDate}` : ` (one-way · checkout ${effectiveEndDate})`}\n` +
        `• **Budget**: ₹${inputs.targetBudget.toLocaleString('en-IN')}\n` +
        `• **Party**: ${inputs.adults} Adults${inputs.kids > 0 ? `, ${inputs.kids} Kids` : ''}\n\n` +
        `*Your full elaborative itinerary is now displayed on the page. Feel free to ask me about specific highlights or local tips!* 🗺️`;
      fire('results', summary, 2500); // 2.5s delay to ensure page results load first
    }
  }, [stage, mounted, authLoading, suggestions.length, plan, inputs.origin, inputs.startDate, inputs.endDate, inputs.tripType, effectiveEndDate]);

  useEffect(() => {
    // Only redirect when auth has fully resolved — never during a loading/refresh cycle.
    // A short delay avoids race conditions where Supabase session refresh transiently
    // sets user=null before re-establishing the session.
    if (!mounted || authLoading) return;
    const isTest = new URLSearchParams(window.location.search).get('test') === 'true';
    if (!user && !isTest) {
      const timer = setTimeout(() => {
        // Double-check store state directly to avoid stale closures
        const currentStage = useTripPlannerStore.getState().plannerStage;
        if (!currentStage || currentStage === 'inputs') {
          console.warn('Auth redirection: No active session found.');
          router.replace('/');
        }
      }, 2000); // 2s grace period for hydration and session refresh
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, router, mounted]);

  // ── Business logic handlers ───────────────────────────────────────────────
  const handleGetSuggestions = async () => {
    if (!inputs.origin) return toast.error('Add departure city', { description: 'Enter the city you are starting from.' });
    if (!inputs.startDate) return toast.error('Add departure date', { description: 'Select your journey start date.' });
    if (inputs.tripType === 'round' && !inputs.endDate) {
      return toast.error('Add return date', { description: 'Round trips need a return date.' });
    }
    if (inputs.targetBudget < 10000 || inputs.targetBudget > 500000)
      return toast.error('Budget out of range', { description: 'Use a budget between ₹10,000 and ₹5,00,000.' });

    setSuggestions([]); setStage('planning');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          origin: inputs.origin, 
          specificDestination: inputs.specificDest || '', 
          targetBudget: inputs.targetBudget, 
          startDate: inputs.startDate, 
          endDate: effectiveEndDate, 
          adults: inputs.adults, 
          kids: inputs.kids, 
          language: activeLang, 
          destTypes: Array.isArray(inputs.destTypes) ? inputs.destTypes : [] 
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Discovery Engine failed');
      const sorted = (data.suggestions || []).sort((a: any, b: any) => {
        const p = (s: string) => parseInt(s?.replace(/[^0-9]/g, '')) || 0;
        return (p(a.budget_cost_estimate) || p(a.budget_train_estimate)) - (p(b.budget_cost_estimate) || p(b.budget_train_estimate));
      });
      setSuggestions(sorted);
      setFetchedInputs({ adults: inputs.adults, kids: inputs.kids });
      setStage('suggestions');
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      const isRate = err.message?.toLowerCase().includes('rate') || err.message?.toLowerCase().includes('limit');
      toast.error(isAbort ? '⏱️ Discovery timed out' : isRate ? '⏳ AI Engine Busy' : 'Search Interrupted', {
        description: isAbort
          ? 'AI is taking too long. Try a specific destination or simpler query.'
          : isRate ? 'Please wait a minute and try again.' : (err.message || 'Discovery Engine unavailable.'),
        duration: isRate || isAbort ? 8000 : 5000,
      });
      setSuggestions([]); setStage('inputs');
    } finally {
      clearTimeout(timeout);
    }
  };



  const handleGeneratePlan = async (overrideSuggestion?: any, overrideDest?: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPlan(null); 
    setStage('planning');
    setTargetBudget(inputs.targetBudget); setTravelers(inputs.adults, inputs.kids); setBudget(inputs.budget);
    setTravelType(inputs.tripType === 'round' ? 'round-trip' : 'one-way');
    if (inputs.startDate) {
      if (inputs.tripType === 'round' && inputs.endDate) setGlobalDates(inputs.startDate, inputs.endDate);
      else if (inputs.tripType === 'single' && effectiveEndDate) setGlobalDates(inputs.startDate, effectiveEndDate);
    }
    if (overrideDest || inputs.specificDest) setGlobalDestination(overrideDest || inputs.specificDest);

    try {
      const suggCtx = overrideSuggestion || (selectedSuggestion !== null ? suggestions[selectedSuggestion] : null);
      const destination = overrideDest || inputs.specificDest;
      const dateRangeLabel =
        inputs.tripType === 'round' && inputs.endDate
          ? `${inputs.startDate} to ${inputs.endDate}`
          : `${inputs.startDate} (one-way; plan through ${effectiveEndDate})`;
      const tripRule =
        inputs.tripType === 'round'
          ? `All transport MUST BE ROUND-TRIP for ${inputs.adults + inputs.kids} people.`
          : `All transport MUST BE ONE-WAY for ${inputs.adults + inputs.kids} people.`;
      const prompt = `Generate a detailed 2026 Indian travel itinerary.\nDestination: ${destination}\nDates: ${dateRangeLabel}\nBudget Category: ${inputs.budget}\nTarget Total: ₹${inputs.targetBudget}\nContext from Discovery: ${suggCtx ? JSON.stringify(suggCtx) : 'None'}\nInclude: Day-wise activities, specific hotel recommendations, local food spots (Diet: ${inputs.dietary.join(',')}), a final total estimate, and a 'highlights' array of 3-4 top attractions.\nPRICING RULE: ${tripRule} The 'price' for transport and the 'totalEstimate' MUST be the final combined sum for the entire party.\nJSON RULES: RFC 8259 JSON only — double-quoted keys and strings; escape any internal double quotes with backslash; no trailing commas; no // comments; output raw JSON only (no markdown fences).\nCRITICAL: Return ONLY a valid JSON object with exactly these keys: { "destination": string, "duration": string, "bestTime": string, "weather": {}, "festivals": [], "hotels": [], "transport": [], "foodSpots": [], "shopping": [], "highlights": [], "safety": {}, "dayPlan": [], "totalEstimate": string }`;

      const gRes = await fetch('/api/ai-brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, stream: false }) });
      const gData = await gRes.json();
      const raw = gData.response || '';

      const parsed = parseAiItineraryJson(raw) as unknown as GeneratedPlan;
      if (parsed.itinerary && !parsed.dayPlan) parsed.dayPlan = parsed.itinerary;
      if (!parsed.dayPlan || !parsed.destination) throw new Error(`AI response missing ${!parsed.dayPlan ? 'dayPlan' : 'destination'}.`);

      setPlan(parsed);

      const nights = inputs.startDate && effectiveEndDate
        ? Math.ceil((new Date(effectiveEndDate).getTime() - new Date(inputs.startDate).getTime()) / 86400000)
        : 1;
      const totalNum = typeof parsed.totalEstimate === 'string' ? parseInt(parsed.totalEstimate.replace(/[^0-9]/g, '')) || 0 : Number(parsed.totalEstimate) || 0;

      setActiveItinerary({
        destination: parsed.destination, duration: parsed.duration, totalEstimate: parsed.totalEstimate,
        bestTime: parsed.bestTime || '2026 Season', dayPlan: parsed.dayPlan, safety: parsed.safety,
        tierLabel: inputs.budget.toUpperCase(), from: inputs.origin, to: parsed.destination,
        startDate: inputs.startDate, endDate: effectiveEndDate, nights, total: parsed.totalEstimate, totalNum,
        transport: { name: parsed.transport?.[0]?.mode || 'Default', price: parsed.transport?.[0]?.price || 'Included', label: 'Primary', detail: parsed.transport?.[0]?.detail || '' },
        hotel: { name: parsed.hotels?.[0]?.name || 'Default', price: parsed.hotels?.[0]?.price || 'Included', label: 'Primary', detail: parsed.hotels?.[0]?.highlights || '' },
        local: { name: 'Local Experience', price: 'Included', label: 'Elite', detail: 'Curated by TourPlan' },
        hotelsList: parsed.hotels, transportList: parsed.transport, foodSpotsList: parsed.foodSpots,
        adults: inputs.adults, kids: inputs.kids,
      });

      if (user) {
        const { data: bookingRow, error } = await supabase
          .from('tourplan_bookings')
          .insert({
            user_id: user.id,
            booking_type: 'TRIP',
            origin: inputs.origin,
            destination: parsed.destination,
            trip_data: {
              ...parsed,
              adults: inputs.adults,
              kids: inputs.kids,
              tripType: inputs.tripType,
              from: inputs.origin,
              to: parsed.destination,
              startDate: inputs.startDate,
              endDate: effectiveEndDate,
            },
            total_amount: totalNum,
            status: 'pending_payment',
          })
          .select('id')
          .single();
        if (error) {
          console.error(
            'Supabase Save Error:',
            error.message || error,
            error.code ?? '',
            error.details ?? '',
            error.hint ?? '',
          );
        } else {
          setActiveBookingId(bookingRow?.id ?? null);
        }
      }

      setActiveStep('confirmed');
      setStage('results');
    } catch (err: any) {
      toast.error('AI Reasoning Interrupted', { description: err.message || 'Please refine your destination and try again.' });
      setStage(stage === 'planning' ? 'suggestions' : stage);
    } finally {
      setIsGenerating(false);
    }
  };

  const ensureActiveBookingSession = async (): Promise<string | null> => {
    if (!user) return null;
    if (activeBookingId) return activeBookingId;
    if (!activeItinerary) return null;

    try {
      const totalNum =
        typeof activeItinerary.totalNum === 'number'
          ? activeItinerary.totalNum
          : (typeof activeItinerary.totalEstimate === 'string'
              ? parseInt(activeItinerary.totalEstimate.replace(/[^0-9]/g, '')) || 0
              : Number(activeItinerary.totalEstimate) || 0);

      const { data: bookingRow, error } = await supabase
        .from('tourplan_bookings')
        .insert({
          user_id: user.id,
          booking_type: 'TRIP',
          origin: activeItinerary.from || inputs.origin,
          destination: activeItinerary.to || inputs.specificDest,
          trip_data: activeItinerary,
          total_amount: totalNum,
          status: 'pending_payment',
          tier: inputs.budget,
          total_pax: (inputs.adults || 1) + (inputs.kids || 0)
        })
        .select('id')
        .single();

      if (error) {
        console.error('Booking Session Recovery Error:', error);
        return null;
      }

      const recoveredId = bookingRow?.id ?? null;
      setActiveBookingId(recoveredId);
      return recoveredId;
    } catch (err) {
      console.error('Booking Session Recovery Exception:', err);
      return null;
    }
  };

  const finalizeBooking = useCallback((opts?: { razorpayPaid?: boolean }) => {
    setAwaitingRazorpayOnSuccess(false);
    const method = paymentMethodRef.current;
    const razorpayPaid = opts?.razorpayPaid === true;
    const bookingIdForFlow = activeBookingIdRef.current;
    const passengers = activeItinerary?.passengers || [];
    const generatedPNR = 'TP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const passengerSummary = passengers.map((p: any) => `${p.name} (${p.type === 'adult' ? 'A' : 'K'})`).join(', ');

    const travelStatus =
      method === 'riya'
        ? 'pending_provider'
        : method === 'razorpay' && razorpayPaid
          ? 'paid'
          : 'pending_payment';

    setStage('success');

    const statusHeadline =
      method === 'razorpay'
        ? razorpayPaid
          ? 'Payment Confirmed'
          : 'Payment Initiated'
        : 'Booking Confirmed';
    const statusLine =
      method === 'razorpay'
        ? razorpayPaid
          ? 'Your Razorpay payment is verified and your booking is marked paid.'
          : 'We are waiting for payment verification before final confirmation.'
        : 'Your booking is confirmed and provider processing has started.';

    addAIMessage({
      role: 'assistant',
      content: `**${statusHeadline}!** 🎉\n\n**PNR: ${generatedPNR}**\n\n**Travelers:** ${passengerSummary}\n\n${statusLine}\n\nI've sent your itinerary details to your **Telegram**. I'll also alert you if there are any delays or weather changes.\n\nEnjoy your Odyssey to **${inputs.specificDest}**!`,
    });
    speakIndianText(
      method === 'razorpay'
        ? razorpayPaid
          ? `Payment confirmed for ${passengers.length} travelers. Your PNR is ${generatedPNR}.`
          : `Payment initiated for ${passengers.length} travelers. Your PNR is ${generatedPNR}.`
        : `Booking confirmed for ${passengers.length} travelers. Your PNR is ${generatedPNR}.`,
      'en',
    );

    const storeTelegramId = useTourGuideStore.getState().telegramId;
    const guestTelegramId = inputs.telegramId || storeTelegramId;

    const sendTelegram = (targetContact: string) => {
      if (!targetContact) return;
      fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_confirm',
          to: targetContact,
          payload: {
            ref: generatedPNR,
            origin: inputs.origin,
            destination: inputs.specificDest,
            transport: useTripPlannerStore.getState().mixPicks.transport?.name || 'Standard',
            hotel: useTripPlannerStore.getState().mixPicks.hotel?.name || 'Standard Hotel',
            tier: inputs.budget,
            total: activeItinerary?.totalEstimate || '0',
            passengers: passengers.map((p: any) => ({ name: p.name, type: p.type })),
          },
        }),
      }).catch((e) => console.error('Telegram Send Error:', e));
    };

    if (user) {
      supabase
        .from('tourplan_profiles')
        .select('telegram_id, phone')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          const targetContact = guestTelegramId || (profile as any)?.telegram_id || profile?.phone;
          sendTelegram(targetContact);
        });

      if (bookingIdForFlow) {
        const bookingSnapshot = {
          ...(activeItinerary || {}),
          from: activeItinerary?.from || inputs.origin,
          to: activeItinerary?.to || inputs.specificDest,
          origin: inputs.origin,
          destination: inputs.specificDest,
          startDate: inputs.startDate,
          endDate: effectiveEndDate,
          tripType: inputs.tripType,
          passengers,
          pnr: generatedPNR,
          bookingStatus: travelStatus,
          bookedAt: new Date().toISOString(),
        };

        supabase
          .from('tourplan_bookings')
          .update({
            pnr: generatedPNR,
            status: travelStatus,
            confirmed_at: razorpayPaid ? new Date().toISOString() : null,
            trip_data: bookingSnapshot,
            tier: inputs.budget,
            total_pax: (inputs.adults || 1) + (inputs.kids || 0),
            trip_details: {
              item_name: 'Custom Itinerary',
              item_detail:
                method === 'riya'
                  ? 'via Riya (pending provider)'
                  : method === 'razorpay'
                    ? razorpayPaid
                      ? 'via Razorpay (paid)'
                      : 'via Razorpay'
                    : 'via TourPlan',
              passengers: passengers,
            },
          })
          .eq('id', bookingIdForFlow)
          .then(({ error }) => {
            if (error) console.error('PNR Save Error:', error);
          });
      }
    } else {
      sendTelegram(guestTelegramId);
    }
  }, [
    activeItinerary,
    effectiveEndDate,
    inputs.budget,
    inputs.origin,
    inputs.specificDest,
    inputs.startDate,
    inputs.telegramId,
    inputs.tripType,
    user,
    addAIMessage,
    setStage,
  ]);

  const launchRazorpayCheckout = useCallback(async () => {
    const bookingIdForFlow = activeBookingIdRef.current;
    if (!user?.id || !bookingIdForFlow) {
      toast.error('Sign in required', {
        description: 'Razorpay needs a saved booking. Sign in and regenerate your itinerary if needed.',
      });
      return;
    }

    paymentMethodRef.current = 'razorpay';

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId || /REPLACE/i.test(keyId)) {
      toast.error('Razorpay not configured', {
        description:
          'Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to frontend/.env.local, then restart the dev server.',
      });
      return;
    }

    const Rzp =
      typeof window !== 'undefined'
        ? (window as typeof window & { Razorpay?: new (options: object) => { open: () => void } }).Razorpay
        : undefined;
    if (!Rzp) {
      toast.error('Payment script not loaded', {
        description: 'Wait a moment and try again, or refresh the page.',
      });
      return;
    }

    const amountRupees = Math.max(
      1,
      typeof activeItinerary?.totalNum === 'number' && activeItinerary.totalNum > 0
        ? Math.round(activeItinerary.totalNum)
        : parseInt(String(activeItinerary?.total || activeItinerary?.totalEstimate || '0').replace(/[^0-9]/g, ''), 10) ||
            1,
    );

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountRupees,
          currency: 'INR',
          receipt: `rcpt_${bookingIdForFlow}`,
        }),
      });
      const order = await res.json();
      if (!res.ok || order.error) {
        throw new Error(order.error || 'Could not create Razorpay order');
      }

      const destLabel = inputs.specificDest || activeItinerary?.to || 'your trip';

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'TourPlan',
        description: `Trip to ${destLabel}`,
        order_id: order.id,
        handler: async (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const loadingToast = toast.loading('Verifying payment…');
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                bookingId: bookingIdForFlow,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              toast.success('Payment successful', { id: loadingToast });
              finalizeBooking({ razorpayPaid: true });
            } else {
              toast.error(verifyJson.error || 'Verification failed', { id: loadingToast });
            }
          } catch {
            toast.error('Could not verify payment', { id: loadingToast });
          }
        },
        modal: {
          ondismiss: () => {},
        },
        prefill: {
          name: user?.user_metadata?.full_name || 'Traveler',
          email: user?.email || '',
          contact: String(user?.phone || '').replace(/\D/g, '').slice(-10) || '',
        },
        theme: { color: '#2563eb' },
      };

      const rzp = new Rzp(options);
      rzp.open();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment could not start';
      toast.error(msg);
    }
  }, [user, activeItinerary, inputs.specificDest, finalizeBooking]);

  const handleBookAndPay = async (method: string) => {
    const bookingIdForFlow = await ensureActiveBookingSession();
    if (user && method !== 'riya' && !bookingIdForFlow) {
      toast.error('Booking session missing', { description: 'Please regenerate itinerary before payment.' });
      return;
    }

    const passengers = activeItinerary?.passengers || [];
    const incomplete = passengers.some((p: any) => {
      const ageNum = Number(p?.age);
      const gender = String(p?.gender || p?.sex || '').trim();
      return !p?.name || p.name.trim().length < 3 || !ageNum || ageNum <= 0 || !gender;
    });

    if (incomplete) {
      toast.error('Passenger Manifest Incomplete', {
        description: 'Please complete name, age, and gender for all travelers in the manifest section.',
      });
      document.querySelector('.glass-panel')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (method === 'razorpay_review') {
      if (!user || !bookingIdForFlow) {
        toast.error('Sign in required', {
          description: 'Save your itinerary while signed in to enable secure checkout.',
        });
        return;
      }
      paymentMethodRef.current = 'razorpay';
      setAwaitingRazorpayOnSuccess(true);
      setStage('success');
      return;
    }

    paymentMethodRef.current = method === 'riya' ? 'riya' : 'direct';

    if (method === 'riya') {
      const AIRPORT_MAP: Record<string, string> = {
        Mumbai: 'BOM',
        Delhi: 'DEL',
        Bangalore: 'BLR',
        Chennai: 'MAA',
        Kolkata: 'CCU',
        Hyderabad: 'HYD',
        Pune: 'PNQ',
        Ahmedabad: 'AMD',
        Jaipur: 'JAI',
        Lucknow: 'LKO',
        Goa: 'GOI',
        Kochi: 'COK',
      };
      const fromCode = AIRPORT_MAP[activeItinerary?.from || ''] || 'BOM';
      const toCode = AIRPORT_MAP[activeItinerary?.to || ''] || 'DEL';
      const params = new URLSearchParams({
        from: `${activeItinerary?.from || inputs.origin}, India[${fromCode}]`,
        to: `${activeItinerary?.to || inputs.specificDest}, India[${toCode}]`,
        departure_date: new Date(inputs.startDate || Date.now()).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        adult: (inputs.adults || 1).toString(),
        child: (inputs.kids || 0).toString(),
        infant: '0',
        class: 'Economy',
        tripType: inputs.tripType === 'round' ? 'R' : 'O',
        search_currency: 'INR',
        fromCountry: 'IN',
        toCountry: 'IN',
        fare: 'N',
      });

      window.open(`https://riya.travel/in/routes/search?${params.toString()}`, '_blank');
      finalizeBooking();
      return;
    }

    finalizeBooking();
  };

  const razorpayPublishableConfigured =
    typeof process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'string' &&
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.trim().length > 0 &&
    !/REPLACE/i.test(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  const estimateCost = () => {
    if (!inputs.origin && !inputs.specificDest) return 0;
    const endForDays = inputs.tripType === 'round' ? inputs.endDate : effectiveEndDate;
    const days =
      inputs.startDate && endForDays
        ? Math.max(1, Math.ceil((new Date(endForDays).getTime() - new Date(inputs.startDate).getTime()) / 86400000))
        : 1;
    const rates: Record<string, number> = { economy: 3500, moderate: 9000, luxury: 28000, mix: 14000 };
    const base = (rates[inputs.budget] || 9000) + ((Array.isArray(inputs.destTypes) ? inputs.destTypes : []).length * 800);
    let total = base * days * (inputs.adults + inputs.kids * 0.7);
    if (inputs.ecoFriendly) total *= 1.15;
    if (inputs.wheelchair) total *= 1.05;
    return Math.round(Math.min(Math.max(total, inputs.targetBudget - 5000), inputs.targetBudget + 5000));
  };

  const cost = estimateCost();

  // Visible steps for indicator (exclude 'planning' intermediate)
  const indicatorSteps = WIZARD_STEPS;
  const currentStepId  = stage === 'planning' ? 'suggestions' : stage;
  const doneSteps      = DONE_MAP[stage] || [];

  if (!mounted) return null;

  return (
    <div className="planner-bg relative selection:bg-cyan-500/30">
      {stage === 'success' ? (
      <NavigationWrapper
        onBack={handleReset}
        backLabel="Plan New Trip"
        onNext={undefined}
      >
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-12 pb-24 relative z-10">
          <StepSuccess
            onReset={handleReset}
            awaitingRazorpayPayment={awaitingRazorpayOnSuccess}
            onPayWithRazorpay={launchRazorpayCheckout}
            razorpayPublishableConfigured={razorpayPublishableConfigured}
            bookingId={activeBookingId}
          />
        </div>
      </NavigationWrapper>
      ) : (
      <NavigationWrapper
        onBack={() => {
          // Read stage directly from store to avoid stale closure
          const s = useTripPlannerStore.getState().plannerStage;
          if (s === 'booking')    setStage('selection');
          else if (s === 'selection') setStage('results');
          else if (s === 'results')   setStage('suggestions');
          else if (s === 'suggestions') setStage('inputs');
          else if (s === 'planning')  setStage('suggestions');
          // 'inputs' = already on first step, do nothing
        }}
        onNext={() => {
          // Read stage directly from store to avoid stale closure
          const s = useTripPlannerStore.getState().plannerStage;
          if (s === 'inputs') {
            handleGetSuggestions();
          } else if (s === 'suggestions') {
            // selectedSuggestion & suggestions are local React state — still fresh here
            if (selectedSuggestion !== null && suggestions[selectedSuggestion]) {
              handleGeneratePlan(suggestions[selectedSuggestion], suggestions[selectedSuggestion].destination);
            }
          } else if (s === 'results') {
            setStage('selection');
          } else if (s === 'selection') {
            setStage('booking');
          } else if (s === 'booking') {
            handleBookAndPay('razorpay_review');
          }
        }}
        nextLabel={
          stage === 'inputs' ? t('discover_options') :
          stage === 'suggestions' ? t('confirm_choice') :
          stage === 'results' ? 'Choose Your Mix →' :
          stage === 'selection' ? 'Confirm & Continue →' :
          stage === 'booking' ? '🔒 Proceed to Checkout' :
          t('next')
        }
      >
        <div className="max-w-4xl mx-auto px-4 md:px-5 pt-2 pb-20 md:pb-24 relative z-10">

          {/* ── Page Header ──────────────────────────────────────────────── */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-3"
          >
            <h1 className="text-xl font-black text-[#003366] uppercase italic">TourPlan Studio</h1>
          </motion.header>

          {/* ── Step Indicator ────────────────────────────────────────────── */}
          <div className="mb-6">
            <StepIndicator 
              steps={indicatorSteps} 
              current={currentStepId} 
              done={doneSteps} 
              onStepClick={(stepId) => {
                if (doneSteps.includes(stepId) || stepId === currentStepId) {
                  setStage(stepId as Stage);
                }
              }}
            />
          </div>


          {/* ── Step Renderer ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {stage === 'inputs' && (
              <StepInputs
                key="inputs"
                inputs={inputs}
                activeLang={activeLang}
                setActiveLang={setActiveLang}
                setInputs={setInputs}
                patchTourGuide={patchTourGuide}
                onDiscover={handleGetSuggestions}
              />
            )}

            {stage === 'planning' && <StepPlanning key="planning" />}

            {stage === 'suggestions' && (
              <StepSuggestions
                key="suggestions"
                suggestions={suggestions}
                inputs={inputs}
                fetchedInputs={fetchedInputs}
                selectedIdx={selectedSuggestion}
                setInputs={setInputs}
                onConfirm={(s, dest) => {
                  setSelectedSuggestion(suggestions.indexOf(s));
                  setInputs(p => ({ ...p, specificDest: dest }));
                  setGlobalDestination(dest); setOrigin(inputs.origin);
                  if (inputs.startDate) {
                    if (inputs.tripType === 'round' && inputs.endDate) setGlobalDates(inputs.startDate, inputs.endDate);
                    else if (inputs.tripType === 'single' && effectiveEndDate) setGlobalDates(inputs.startDate, effectiveEndDate);
                  }
                  handleGeneratePlan(s, dest);
                  setAIBrainOpen(true);
                  addAIMessage({ role: 'assistant', content: `**Trip Confirmed!** Building your itinerary for **${dest}**…` });
                  speakIndianText('Trip confirmed.', 'en');
                }}
                onAskAI={(dest) => {
                  const from = inputs.origin?.trim() || 'India';
                  setPendingOutbound({
                    destinationBriefFormat: true,
                    text: `Destination briefing for ${dest}. Traveller departs from ${from}.`,
                  });
                  setAIBrainOpen(true);
                }}
                onBack={() => setStage('inputs')}
                onReset={handleReset}
              />
            )}

            {stage === 'results' && plan && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="shell-panel p-10 bg-[#003366] text-white space-y-8 rounded-[3rem] shadow-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 blur-[100px] pointer-events-none" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/30">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Itinerary Drafted</span>
                      </div>
                      <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter">{plan.destination}</h3>
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{plan.duration} · {plan.bestTime || 'Best Season'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                          <Plane className="w-5 h-5 text-cyan-400 mb-2" />
                          <p className="text-[8px] font-black text-slate-400 uppercase">Primary Route</p>
                          <p className="text-xs font-bold uppercase truncate">{plan.transport?.[0]?.mode || 'Flight/Train'}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                          <Hotel className="w-5 h-5 text-cyan-400 mb-2" />
                          <p className="text-[8px] font-black text-slate-400 uppercase">Top Stay</p>
                          <p className="text-xs font-bold uppercase truncate">{plan.hotels?.[0]?.name || 'Luxury Resort'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Highlights</p>
                         <div className="flex flex-wrap gap-2">
                            {(plan.highlights || ['Historic Sites', 'Local Cuisine', 'Nature']).slice(0, 4).map((h: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-tight">{h}</span>
                            ))}
                         </div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Total Valuation</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white">{plan.totalEstimate}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">(Inclusive of transport & stays for all travelers)</p>
                      </div>
                      
                      <div className="pt-6 mt-6 border-t border-white/10">
                         <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <div className="min-w-0">
                               <p className="text-[9px] font-black text-emerald-400 uppercase">Safety Score</p>
                               <p className="text-[10px] text-slate-200 font-medium leading-relaxed italic truncate">
                                  {typeof plan.safety === 'object' ? (plan.safety as any).rating || '9.8/10 High Security' : '9.8/10 High Security'}
                               </p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setStage('selection')} 
                    className="w-full py-6 bg-gradient-to-r from-cyan-400 via-white to-green-500 text-[#003366] rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all relative z-10"
                  >
                    Configure Selection Studio →
                  </button>
                </div>
              </motion.div>
            )}

            {stage === 'selection' && (
              <motion.div key="selection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <TripPlanner
                  origin={inputs.origin}
                  destination={inputs.specificDest || useTripStore.getState().destination}
                  startDate={inputs.startDate}
                  endDate={effectiveEndDate}
                  suggestion={selectedSuggestion !== null ? suggestions[selectedSuggestion] : null}
                  onComplete={() => setStage('booking')}
                />
              </motion.div>
            )}

            {stage === 'booking' && (
              <StepBooking
                key="booking"
                searchData={searchData}
                setInputs={setInputs}
                onBack={() => setStage('selection')}
                onBookAndPay={handleBookAndPay}
              />
            )}
          </AnimatePresence>
        </div>
      </NavigationWrapper>
      )}
    </div>
  );
}
