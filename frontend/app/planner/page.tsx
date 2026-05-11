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
import { useTripStore, useAIBrainStore, useTripPlannerStore, useTourGuideStore } from '@/lib/store';
import { parsePhone } from '@/lib/wizardParsers';

import { parseAiItineraryJson } from '@/lib/parseAiItineraryJson';
import { supabase } from '@/lib/supabase/client';
import TripPlanner from '@/components/TripPlanner';
import AIBrain from '@/components/AIBrain';
import { speakIndianText } from '@/lib/bhashini';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

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
  weather: { 
    temp: string; 
    condition: string; 
    tip?: string;
    forecast?: Array<{ day: number; temp: string; condition: string }>;
  };
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
  { id: 'inputs',      label: 'DETAILS' },
  { id: 'suggestions', label: 'OPTIONS' },
  { id: 'results',     label: 'ITINERARY' },
  { id: 'selection',   label: 'SELECTION' },
  { id: 'booking',     label: 'BOOK' },
  { id: 'success',     label: 'COMPLETE' },
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
export default function YatraStudio() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setLanguage, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    isOpen: isAIBrainOpen, setOpen: setAIBrainOpen,
    addMessage: addAIMessage, clearHistory: clearAIMessages,
    registerInputUpdateHandler, registerWizardSchema, setWizardMode,
    setPendingOutbound,
  } = useAIBrainStore();
  const { activeItinerary, setActiveItinerary, setActiveStep, searchData, activeBookingId, setActiveBookingId, mixPicks, setMixPicks } = useTripPlannerStore();
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
            totalPrice: activeItineraryStore.totalNum, // Aligned with API
            fullPlan: activeItineraryStore.dayPlan,
            // Ensure the latest Cart picks (mixPicks) are captured
            transport: activeItineraryStore.transport,
            hotel: activeItineraryStore.hotel,
            local: activeItineraryStore.local
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
    patchTourGuide({ planner_stage: stage, mix_picks: mixPicks });
  }, [stage, mixPicks, patchTourGuide]);

  const [activeLang, setActiveLang] = useState<Language>((language as Language) || 'en');

  // Keep local language in sync with global context
  useEffect(() => {
    if (language && language !== activeLang) {
      const next = language as Language;
      setActiveLang(next);
      setInputs(p => ({ ...p, language: next }));
    }
  }, [language, activeLang]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan]         = useState<GeneratedPlan | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [fetchedInputs, setFetchedInputs] = useState<{ adults: number; kids: number } | null>(null);
  const activeBookingIdRef = useRef<string | null>(null);

  // Sync ref for callback stability
  useEffect(() => {
    activeBookingIdRef.current = activeBookingId;
  }, [activeBookingId]);
  const paymentMethodRef = useRef<'direct'>('direct');

  function handleReset() {
    if (announcedStages.current) announcedStages.current.clear();
    tripConfirmed.current = false;
    useTripPlannerStore.getState().clearPlan();
    setInputs({ ...INITIAL_PLANNER_INPUTS, language: (language as Language) || 'en' });
    setActiveLang((language as Language) || 'en');
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

  const [inputs, setInputs] = useState<PlannerInputs>(() => ({ 
    ...INITIAL_PLANNER_INPUTS, 
    language: (language as Language) || 'en' 
  }));

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
        .from('yatra_tour_guide_sessions')
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
   useEffect(() => { setMounted(true); window.scrollTo(0, 0); }, []);
 
   const [hasDeterminedInitialAuth, setHasDeterminedInitialAuth] = useState(false);

  useEffect(() => {
    if (!mounted || authLoading) return;
    
    const uid = user?.id ?? 'guest';
    const sessionKey = `yatra_session_init_${uid}`;
    
    // Check if we've already initialized this planner session for this user in this tab
    const hasInit = sessionStorage.getItem(sessionKey);
    
    if (!hasInit) {
      console.log(`[Planner] Initializing fresh session for ${uid}. Forcing reset to Details.`);
      handleReset();
      sessionStorage.setItem(sessionKey, 'true');
    }
    
    setHasDeterminedInitialAuth(true);
  }, [mounted, authLoading, user?.id]);

  // ── Profile Sync to TripStore ──────────────────────────────────────────
  useEffect(() => {
    if (!user || !mounted) return;
    const userId = user.id;
    async function loadProfile() {
      const { data, error } = await supabase
        .from('yatra_profiles')
        .select('user_persona, likes, dislikes')
        .eq('user_id', userId)
        .single();
      
      if (!error && data) {
        const store = useTripStore.getState();
        if (data.user_persona) store.setUserPersona(data.user_persona);
        if (data.likes) store.setLikes(data.likes);
        if (data.dislikes) store.setDislikes(data.dislikes);
      }
    }
    loadProfile();
  }, [user, mounted]);
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

    // We no longer use a fixed wizard schema. 
    // The AI Brain now works hand-in-hand with the stage pages.
    registerWizardSchema([]); 
    setWizardMode(false);

    registerInputUpdateHandler((id, val) => {
      if (id === 'hotelTier') {
        useTripPlannerStore.getState().setHotelTier(val as any);
      }
      if (id === 'dietary') {
        setInputs(prev => ({ ...prev, dietary: [val as any] }));
      } else {
        setInputs(prev => ({ ...prev, [id]: val }));
      }
      if (id === 'language') {
        setLanguage(val as string);
        setActiveLang(val as any);
      }
    });

    // We no longer auto-open the AI Brain on empty inputs to avoid distraction.
    // The user can open it manually or it will be triggered by stage changes.

    return () => {
      registerInputUpdateHandler(null);
      registerWizardSchema([]);
      setWizardMode(false);
    };
  }, [mounted, authLoading, t]);

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
    setGlobalDestination(inputs.specificDest);
    setOrigin(inputs.origin);
    if (inputs.startDate) {
      if (inputs.tripType === 'round' && inputs.endDate) {
        setGlobalDates(inputs.startDate, inputs.endDate);
      } else if (inputs.tripType === 'single' && effectiveEndDate) {
        setGlobalDates(inputs.startDate, effectiveEndDate);
      }
    } else {
      setGlobalDates('', '');
    }
    setTargetBudget(inputs.targetBudget);
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
    if (overrideDest || inputs.specificDest) {
      const d = overrideDest || inputs.specificDest;
      setGlobalDestination(d);
      setInputs(prev => ({ ...prev, specificDest: d }));
    }
    if (inputs.startDate) {
      setOrigin(inputs.origin);
      if (inputs.tripType === 'round' && inputs.endDate) setGlobalDates(inputs.startDate, inputs.endDate);
      else if (inputs.tripType === 'single' && effectiveEndDate) setGlobalDates(inputs.startDate, effectiveEndDate);
    }

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
      const prompt = `Generate a detailed 2026 Indian travel itinerary.\nDestination: ${destination}\nDates: ${dateRangeLabel}\nBudget Category: ${inputs.budget}\nTarget Total: ₹${inputs.targetBudget}\nContext from Discovery: ${suggCtx ? JSON.stringify(suggCtx) : 'None'}\nWEATHER RULE: Provide an elaborative weather object with a daily forecast. Include: Day-wise activities, specific hotel recommendations, local food spots (Diet: ${inputs.dietary.join(',')}), a final total estimate, and a 'highlights' array of 3-4 top attractions.\nPRICING RULE: ${tripRule} The 'price' for transport and the 'totalEstimate' MUST be the final combined sum for the entire party.\nJSON RULES: RFC 8259 JSON only — double-quoted keys and strings; escape any internal double quotes with backslash; no trailing commas; no // comments; output raw JSON only (no markdown fences).\nCRITICAL: Return ONLY a valid JSON object with exactly these keys: { "destination": string, "duration": string, "bestTime": string, "weather": { "temp": string, "condition": string, "tip": string, "forecast": [] }, "festivals": [], "hotels": [], "transport": [], "foodSpots": [], "shopping": [], "highlights": [], "safety": {}, "dayPlan": [], "totalEstimate": string }`;

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

      const itn = {
        destination: parsed.destination, duration: parsed.duration, totalEstimate: parsed.totalEstimate,
        bestTime: parsed.bestTime || '2026 Season', dayPlan: parsed.dayPlan, safety: parsed.safety,
        tierLabel: inputs.budget.toUpperCase(), from: inputs.origin || 'Source', to: parsed.destination,
        startDate: inputs.startDate, endDate: effectiveEndDate, nights, total: parsed.totalEstimate, totalNum,
        transport: { name: parsed.transport?.[0]?.mode || 'Flight/Train', price: parsed.transport?.[0]?.price || 'Included', label: 'Primary', detail: parsed.transport?.[0]?.detail || '' },
        hotel: { name: parsed.hotels?.[0]?.name || 'Premium Stay', price: parsed.hotels?.[0]?.price || 'Included', label: 'Primary', detail: parsed.hotels?.[0]?.highlights || '' },
        local: { name: 'Local Experience', price: 'Included', label: 'Elite', detail: 'Curated by Yatra' },
        hotelsList: parsed.hotels, transportList: parsed.transport, foodSpotsList: parsed.foodSpots,
        adults: inputs.adults, kids: inputs.kids,
        weather: parsed.weather ? {
          temp: parsed.weather.temp,
          condition: parsed.weather.condition,
          tip: (parsed.weather as any).tip || 'Pack according to seasonal shifts.',
          forecast: (parsed.weather as any).forecast || []
        } : undefined,
      };

      // Comprehensive Sync to Global State
      setOrigin(inputs.origin);
      setGlobalDestination(parsed.destination);
      if (inputs.startDate) setGlobalDates(inputs.startDate, effectiveEndDate);
      setTravelers(inputs.adults, inputs.kids);
      setInputs(prev => ({ ...prev, specificDest: parsed.destination }));

      setActiveItinerary(itn);
      
      // Auto-set mix picks from AI itinerary
      setMixPicks({
        transport: itn.transportList?.[0] ? { 
          label: itn.transportList[0].mode || 'Flight', 
          name: itn.transportList[0].mode?.toLowerCase().includes('flight') ? 'IndiGo | 6E-532' : (itn.transportList[0].mode || 'Premium Transit'), 
          detail: itn.transportList[0].detail || 'Non-stop • 2h 15m', 
          price: itn.transportList[0].price && itn.transportList[0].price !== 'Included' ? itn.transportList[0].price : '₹12,500', 
          priceNum: parseInt(String(itn.transportList[0].price && itn.transportList[0].price !== 'Included' ? itn.transportList[0].price : '12500').replace(/[^0-9]/g, '')) || 12500,
          icon: String(itn.transportList[0].mode || '').toLowerCase().includes('flight') ? Plane : Train
        } : null,
        hotel: itn.hotelsList?.[0] ? {
          label: 'Hotel',
          name: itn.hotelsList[0].name || 'The Grand Heritage',
          detail: itn.hotelsList[0].highlights || '★ ★ ★ ★ ★ • City Center',
          price: itn.hotelsList[0].price && itn.hotelsList[0].price !== 'Included' ? itn.hotelsList[0].price : '₹6,500',
          priceNum: parseInt(String(itn.hotelsList[0].price && itn.hotelsList[0].price !== 'Included' ? itn.hotelsList[0].price : '6500').replace(/[^0-9]/g, '')) || 6500,
          icon: Hotel
        } : null,
        local: {
          label: 'Mobility',
          name: 'Ola Mini / Prime',
          detail: 'On-demand • 5-10 min ETA',
          price: '₹850',
          priceNum: 850,
          icon: Car
        }
      });
      
      // Sync AI recommendations to Selection Studio search data with better field mapping
      useTripPlannerStore.getState().setSearchData({
        hotels: parsed.hotels.map((h: any) => ({
          ...h,
          name: h.name,
          location: parsed.destination,
          area: h.highlights?.split(',')[0] || 'Prime Location',
          id: `ai-hotel-${Math.random()}`,
          isAI: true
        })),
        flights: parsed.transport.filter((t: any) => String(t.mode || '').toLowerCase().includes('flight')).map((t: any) => ({
          ...t,
          name: t.mode || 'AI Flight',
          airline: t.mode || 'Domestic Flight',
          departure: '08:00', // AI Placeholder
          arrival: '10:30',   // AI Placeholder
          id: `ai-flight-${Math.random()}`,
          isAI: true
        })),
        trains: parsed.transport.filter((t: any) => String(t.mode || '').toLowerCase().includes('train')).map((t: any) => ({
          ...t,
          name: t.mode || 'AI Train',
          train_name: t.mode || 'Express Train',
          class: t.detail?.split(' ')[0] || '2A',
          id: `ai-train-${Math.random()}`,
          isAI: true
        }))
      });

      if (user) {
        const { data: bookingRow, error } = await supabase
          .from('yatra_bookings')
          .insert({
            user_id: user.id,
            booking_type: 'TRIP',
            origin: inputs.origin,
            destination: parsed.destination,
            trip_details: {
              ...parsed,
              adults: inputs.adults,
              kids: inputs.kids,
              tripType: inputs.tripType,
              from: inputs.origin,
              to: parsed.destination,
              startDate: inputs.startDate,
              endDate: effectiveEndDate,
            },
            total_price: totalNum,
            status: 'pending_payment',
            tier: inputs.budget,
            total_pax: (inputs.adults || 1) + (inputs.kids || 0)
          })
          .select('id')
          .single();

        if (error) {
          console.error('Supabase Save Error:', error.message, error.code);
          toast.error('Booking Sync Failed', { description: 'Plan was generated but could not be saved to cloud.' });
        } else if (bookingRow?.id) {
          setActiveBookingId(bookingRow.id);
        }
      }

      setActiveStep('confirmed');
      setStage('selection');
    } catch (err: any) {
      toast.error('AI Reasoning Interrupted', { description: err.message || 'Please refine your destination and try again.' });
      setStage(stage === 'planning' ? 'suggestions' : stage);
    } finally {
      setIsGenerating(false);
    }
  };

  const ensureActiveBookingSession = async (): Promise<string | null> => {
    if (!user) return null;
    
    // 1. Check local store first
    if (activeBookingId) return activeBookingId;

    // 2. Try to fetch most recent pending booking for this user/destination
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('yatra_bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!fetchErr && existing?.id) {
        setActiveBookingId(existing.id);
        return existing.id;
      }
    } catch (e) {
      console.warn('Booking fetch failed', e);
    }

    // 3. Last resort: Create new if itinerary exists
    if (!activeItinerary) return null;

    try {
      const totalNum =
        typeof activeItinerary.totalNum === 'number'
          ? activeItinerary.totalNum
          : (typeof activeItinerary.totalEstimate === 'string'
              ? parseInt(activeItinerary.totalEstimate.replace(/[^0-9]/g, '')) || 0
              : Number(activeItinerary.totalEstimate) || 0);

      const { data: bookingRow, error } = await supabase
        .from('yatra_bookings')
        .insert({
          user_id: user.id,
          booking_type: 'TRIP',
          origin: activeItinerary.from || inputs.origin,
          destination: activeItinerary.to || inputs.specificDest,
          trip_details: activeItinerary,
          total_price: totalNum,
          status: 'pending_payment',
          tier: inputs.budget,
          total_pax: (inputs.adults || 1) + (inputs.kids || 0)
        })
        .select('id')
        .single();

      if (error) {
        console.error('Booking Session Sync Error:', error);
        toast.error('Booking Sync Failed', { description: error.message });
        return null;
      }

      const recoveredId = bookingRow?.id ?? null;
      setActiveBookingId(recoveredId);
      return recoveredId;
    } catch (err: any) {
      console.error('Booking Session Recovery Exception:', err);
      toast.error('Session Recovery Error', { description: err.message || 'An unexpected error occurred.' });
      return null;
    }
  };

  const finalizeBooking = useCallback(() => {
    const method = paymentMethodRef.current;
    const bookingIdForFlow = activeBookingIdRef.current;
    const currentMix = useTripPlannerStore.getState().mixPicks;
    const currentItn = useTripPlannerStore.getState().activeItinerary;
    
    // Merge user's final selections into the itinerary
    const finalTotalNum = (currentMix.transport?.priceNum || 0) + 
                         (currentMix.hotel?.priceNum || 0) + 
                         (currentMix.local?.priceNum || 0);
                         
    const finalItn = {
      ...currentItn,
      transport: currentMix.transport,
      hotel: currentMix.hotel,
      local: currentMix.local,
      totalNum: finalTotalNum,
      total: `₹${finalTotalNum.toLocaleString()}`,
      passengers: activeItinerary?.passengers || []
    };
    
    // Update store so StepSuccess sees the final data
    useTripPlannerStore.getState().setActiveItinerary(finalItn as any);

    const passengers = finalItn.passengers;
    const generatedPNR = 'YA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const passengerSummary = passengers.map((p: any) => `${p.name} (${p.type === 'adult' ? 'A' : 'K'})`).join(', ');

    const travelStatus = 'confirmed';
    setStage('success');

    const statusHeadline = 'Booking Confirmed';
    const statusLine = 'Your booking is confirmed and provider processing has started.';

    addAIMessage({
      role: 'assistant',
      content: `**${statusHeadline}!** 🎉\n\n**PNR: ${generatedPNR}**\n\n**Travelers:** ${passengerSummary}\n\n${statusLine}\n\nI've sent your itinerary details to your **Telegram**. I'll also alert you if there are any delays or weather changes.\n\nEnjoy your Odyssey to **${inputs.specificDest}**!`,
    });
    speakIndianText(`Booking confirmed for ${passengers.length} travelers. Your PNR is ${generatedPNR}.`, 'en');

    const storeTelegramId = useTourGuideStore.getState().telegramId;
    const guestTelegramId = inputs.telegramId || storeTelegramId;

    const sendTelegram = (targetContact: string) => {
      if (!targetContact) return;
      
      const currentMix = useTripPlannerStore.getState().mixPicks;
      const currentItn = activeItinerary;
      
      // Calculate real total from current mix to ensure accuracy
      const totalDisplay = currentItn?.total || `₹${(currentItn?.totalNum || 0).toLocaleString()}`;

      fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_confirm',
          to: targetContact,
          payload: {
            ref: generatedPNR,
            origin: currentItn?.from || inputs.origin || 'India',
            destination: currentItn?.to || inputs.specificDest,
            dates: currentItn?.startDate && currentItn?.endDate ? `${currentItn.startDate} to ${currentItn.endDate}` : 'Dates in App',
            transport: currentMix.transport?.name || currentItn?.transport?.name || 'Standard',
            hotel: currentMix.hotel?.name || currentItn?.hotel?.name || 'Standard Hotel',
            tier: inputs.budget,
            total: totalDisplay,
            passengers: passengers.map((p: any) => ({ name: p.name, type: p.type })),
          },
        }),
      }).catch((e) => console.error('Telegram Send Error:', e));
    };

    if (user) {
      supabase
        .from('yatra_profiles')
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
          .from('yatra_bookings')
          .update({
            pnr: generatedPNR,
            status: travelStatus,
            confirmed_at: new Date().toISOString(),
            trip_details: bookingSnapshot,
            tier: inputs.budget,
            total_pax: (inputs.adults || 1) + (inputs.kids || 0),
            passengers: passengers,
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




  const handleBookAndPay = async () => {
    const bookingIdForFlow = await ensureActiveBookingSession();
    if (user && !bookingIdForFlow) {
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
      toast.error('Missing Traveler Info', { description: 'Please fill all name, age, and gender fields.' });
      return;
    }

    finalizeBooking();
  };



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

  // COMPULSORY WIZARD: If the wizard is active, we lock navigation entirely.
  const isWizardMode = useAIBrainStore(s => s.isWizardMode);
  const wizardStep = useAIBrainStore(s => s.wizardStep);
  const isWizardActive = !!(isWizardMode && wizardStep && wizardStep !== 'done');

  // Visible steps for indicator (exclude 'planning' intermediate)
  const indicatorSteps = useMemo(() => WIZARD_STEPS.map(s => ({ 
    ...s, 
    label: t(s.id === 'booking' ? 'booking_step' : s.id, s.label) 
  })), [t]);
  const currentStepId  = stage === 'planning' ? 'suggestions' : stage;
  const doneSteps      = isWizardActive ? [] : (DONE_MAP[stage] || []);

  const { isInitialized: langInitialized } = useLanguage();

  if (!mounted || !langInitialized) return null;

  return (
    <div key={language} className="planner-bg relative selection:bg-cyan-500/30">
      {stage === 'success' ? (
      <NavigationWrapper
        onBack={handleReset}
        backLabel="Plan New Trip"
        onNext={undefined}
      >
        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-12 pb-24 relative z-10">
          <StepSuccess
            onReset={handleReset}
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
          // Once destination is selected (results), going back skips 'suggestions' and goes to 'inputs'
          else if (s === 'results')   setStage('inputs'); 
          else if (s === 'suggestions') setStage('inputs');
          else if (s === 'planning')  setStage('suggestions');
          // 'inputs' = already on first step, do nothing
        }}
        disabledNext={isWizardActive}
        onNext={() => {
          if (isWizardActive) return;
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
            handleBookAndPay();
          }
        }}
        nextLabel={
          isWizardActive ? 'Answer AI to proceed' :
          stage === 'inputs' ? t('discover_options') :
          stage === 'suggestions' ? t('confirm_choice') :
          stage === 'results' ? 'Choose Your Mix →' :
          stage === 'selection' ? 'Confirm & Continue →' :
          stage === 'booking' ? '🔒 Confirm & Finalize' :
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
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              <span className="text-saffron">YA</span>
              <span className="text-slate-400">T</span>
              <span className="text-green">RA</span> 
              <span className="text-saffron ml-1">STUDIO</span>
            </h1>
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
                <div className="shell-panel p-10 bg-white border border-orange-100 text-[#1A1A2E] space-y-8 rounded-[3rem] shadow-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-saffron/5 blur-[100px] pointer-events-none" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron/10 border border-saffron/20">
                        <Sparkles className="w-3.5 h-3.5 text-saffron" />
                        <span className="text-[10px] font-black text-saffron uppercase tracking-widest">Itinerary Drafted</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-black italic uppercase leading-none tracking-tighter text-[#1A1A2E]">{plan.destination}</h3>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">{plan.duration}</p>
                        <p className="text-[10px] font-black text-saffron uppercase tracking-[0.2em] leading-none flex items-center gap-2">
                          Approx. Valuation:
                          <span className="text-base font-black text-blue-700 tracking-tighter">
                            {plan.totalEstimate.match(/₹\s?[\d,]+/)?.[0] || plan.totalEstimate}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Elaborative Weather Timeline */}
                    {plan.weather?.forecast && plan.weather.forecast.length > 0 && (
                      <div className="flex flex-col gap-3 relative z-10">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Trip Forecast</span>
                           <div className="h-px flex-1 bg-blue-100/50" />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                           {plan.weather.forecast.map((wf: any, idx: number) => {
                             const d = new Date(inputs.startDate);
                             d.setDate(d.getDate() + idx);
                             const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                             
                             return (
                               <div key={idx} className="flex-shrink-0 w-24 p-3 bg-blue-50/30 border border-blue-100/50 rounded-2xl flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black text-slate-400 uppercase">Day {wf.day || idx + 1}</span>
                                  <span className="text-[9px] font-bold text-blue-600/60 uppercase">{dateStr}</span>
                                  <span className="text-[11px] font-black text-blue-700">{wf.temp}</span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase text-center leading-none">{wf.condition}</span>
                               </div>
                             );
                           })}
                        </div>
                        {plan.weather.tip && (
                          <p className="text-xs sm:text-sm text-blue-700 font-bold leading-relaxed ml-20 border-l-2 border-blue-100 pl-6 py-1">
                            <span className="text-blue-900 uppercase text-[10px] tracking-widest mr-2 block mb-1">Pro Tip:</span> 
                            {plan.weather.tip}
                          </p>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={handleReset}
                      className="p-3 bg-orange-50 hover:bg-orange-100 rounded-2xl transition-all border border-orange-100 group shadow-sm self-start"
                      title="Cancel & Start Over"
                    >
                      <RotateCcw className="w-5 h-5 text-saffron group-hover:rotate-[-90deg] transition-transform" />
                    </button>
                  </div>

                  <div className="relative z-10">
                    <div className="space-y-8">
                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Highlights</p>
                         <div className="flex flex-wrap gap-2">
                            {(plan.highlights || ['Historic Sites', 'Local Cuisine', 'Nature']).slice(0, 4).map((h: string, i: number) => (
                              <span key={i} className="px-3 py-1.5 bg-orange-50/50 border border-orange-100 rounded-xl text-[9px] font-bold uppercase tracking-tight text-saffron">{h}</span>
                            ))}
                         </div>
                      </div>

                      {/* Visual Experience Gallery - Moved Here */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Visual Experiences</span>
                            <div className="h-px flex-1 bg-orange-100/50" />
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { img: '/assets/experiences/old_goa.png', title: 'Old Goa Heritage', desc: 'UNESCO World Heritage Sites' },
                              { img: '/assets/experiences/chapora_sunset.png', title: 'Chapora Sunset', desc: 'Epic views from the ramparts' },
                              { img: '/assets/experiences/goan_thali.png', title: 'Authentic Thali', desc: 'Indulge in Goan flavors' },
                              { img: '/assets/experiences/fontainhas.png', title: 'Latin Quarter', desc: 'Colors of Fontainhas' }
                            ].map((exp, i) => (
                              <div key={i} className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-orange-100 shadow-sm hover:shadow-xl transition-all duration-500">
                                 <img src={exp.img} alt={exp.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                                 <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-orange-400 leading-none mb-1">{exp.title}</p>
                                    <p className="text-[8px] font-bold text-white/80 uppercase leading-tight line-clamp-2">{exp.desc}</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>

                  </div>

                  <button 
                    onClick={() => {
                      // Final Safety Sync & Auto-Selection before entering Selection Studio
                      if (plan) {
                        const aiHotels = plan.hotels.map((h: any) => ({
                          ...h,
                          name: h.name,
                          location: plan.destination,
                          area: h.highlights?.split(',')[0] || 'Prime Location',
                          id: `ai-hotel-${Math.random()}`,
                          isAI: true
                        }));
                        const aiFlights = plan.transport.filter((t: any) => t.mode.toLowerCase().includes('flight')).map((t: any) => ({
                          ...t,
                          name: t.mode,
                          airline: t.mode,
                          departure: '08:00',
                          arrival: '10:30',
                          id: `ai-flight-${Math.random()}`,
                          isAI: true
                        }));
                        const aiTrains = plan.transport.filter((t: any) => t.mode.toLowerCase().includes('train')).map((t: any) => ({
                          ...t,
                          name: t.mode,
                          train_name: t.mode,
                          class: t.detail?.split(' ')[0] || '2A',
                          id: `ai-train-${Math.random()}`,
                          isAI: true
                        }));

                        // Force search data update
                        useTripPlannerStore.getState().setSearchData({
                          hotels: aiHotels,
                          flights: aiFlights,
                          trains: aiTrains
                        });

                        // Auto-select the first options to pre-fill the cart
                        setMixPicks({
                          hotel: aiHotels[0] || null,
                          transport: aiFlights[0] || aiTrains[0] || null
                        });
                      }
                      setStage('selection');
                    }} 
                    className="w-full py-6 bg-gradient-to-r from-saffron via-white to-green text-[#1A1A2E] rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all relative z-10 border border-orange-100"
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
                  tripType={inputs.tripType}
                  suggestion={selectedSuggestion !== null ? suggestions[selectedSuggestion] : null}
                  onComplete={() => setStage('booking')}
                  onBack={() => setStage('results')}
                />
              </motion.div>
            )}

            {stage === 'booking' && (
              <StepBooking
                key="booking"
                searchData={searchData}
                setInputs={setInputs}
                nights={activeItinerary?.nights || 1}
                tripType={inputs.tripType}
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
