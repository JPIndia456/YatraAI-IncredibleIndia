import { create } from 'zustand';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
export interface DayItinerary {
  day: number;
  title: string;
  activities: string[];
  meals: string[];
  lodging?: string;
}

export type BookingStatus = 'idle' | 'optimistic' | 'confirming' | 'confirmed' | 'failed';

export interface OptimisticBooking {
  id: string;
  origin: string;
  destination: string;
  tier: string;
  transport: string;
  hotel: string;
  total: number;
  status: BookingStatus;
  createdAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  isStreaming?: boolean;
  // Optional quick-reply chips (destinations, dates, budgets, etc.)
  quickReplies?: Array<{
    label: string;
    value: string;
    field: 'origin' | 'destination' | 'startDate' | 'endDate' | 'budget' | 'adults';
  }>;
}

// ────────────────────────────────────────────────
// Trip Store
// ────────────────────────────────────────────────
interface TripState {
  origin: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  budget: 'Kshatriya' | 'Vaisya' | 'Brahmin' | 'economy' | 'moderate' | 'luxury' | 'mix';
  targetBudget: number;
  adults: number;
  kids: number;
  travelType: string;
  userPersona: string;
  likes: string[];
  dislikes: string[];

  // Generated Itinerary
  itinerary: DayItinerary[] | null;
  isLoading: boolean;

  // Optimistic Bookings — shown instantly, synced later
  bookings: OptimisticBooking[];

  isOnboarded: boolean;
  telegramEnabled: boolean;
  telegramId: string | null;

  // Actions
  setOrigin: (origin: string) => void;
  setDestination: (dest: string) => void;
  setDates: (start: string, end: string) => void;
  setBudget: (budget: 'Kshatriya' | 'Vaisya' | 'Brahmin' | 'economy' | 'moderate' | 'luxury' | 'mix') => void;
  setTargetBudget: (budget: number) => void;
  setTravelers: (adults: number, kids: number) => void;
  setTravelType: (type: string) => void;
  setItinerary: (itinerary: DayItinerary[] | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboarded: (v: boolean) => void;
  resetTrip: () => void;
  setTelegram: (enabled: boolean, telegramId: string | null) => void;
  setUserPersona: (persona: string) => void;
  setLikes: (likes: string[]) => void;
  setDislikes: (dislikes: string[]) => void;

  // Optimistic booking actions
  addOptimisticBooking: (booking: Omit<OptimisticBooking, 'id' | 'createdAt' | 'status'>) => string;
  confirmBooking: (id: string) => void;
  failBooking: (id: string) => void;
  removeBooking: (id: string) => void;
}

// Cross-store bridge: TripPlannerStore registers its clearPlan here
// so TripStore can call it without a circular import

export const useTripStore = create<TripState>((set, get) => ({
  origin: '',
  destination: '',
  startDate: null,
  endDate: null,
  budget: 'Vaisya',
  targetBudget: 50000,
  adults: 1,
  kids: 0,
  travelType: 'leisure',
  itinerary: null,
  isLoading: false,
  bookings: [],
  telegramEnabled: false,
  telegramId: null,
  isOnboarded: false,
  userPersona: 'Cultural Explorer',
  likes: [],
  dislikes: [],

  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => {
    if (get().destination === destination) return;
    set({ destination });
  },
  setDates: (startDate, endDate) => set({ startDate, endDate }),
  setBudget: (budget) => set({ budget }),
  setTargetBudget: (targetBudget) => set({ targetBudget }),
  setTravelers: (adults, kids) => set({ adults, kids }),
  setTravelType: (travelType) => set({ travelType }),
  setItinerary: (itinerary) => set({ itinerary }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  setTelegram: (telegramEnabled, telegramId) => set({ telegramEnabled, telegramId }),
  setUserPersona: (userPersona) => set({ userPersona }),
  setLikes: (likes) => set({ likes }),
  setDislikes: (dislikes) => set({ dislikes }),
  resetTrip: () => set({
    origin: '',
    destination: '',
    startDate: null,
    endDate: null,
    itinerary: null,
    isLoading: false,
    isOnboarded: false,
  }),

  // Create an optimistic booking immediately, return its temp id
  addOptimisticBooking: (booking) => {
    const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      bookings: [
        { ...booking, id, status: 'optimistic', createdAt: Date.now() },
        ...state.bookings,
      ],
    }));
    return id;
  },

  // Once server confirms, mark as confirmed
  confirmBooking: (id) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, status: 'confirmed' } : b
      ),
    })),

  // On API failure, roll back to failed state
  failBooking: (id) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, status: 'failed' } : b
      ),
    })),

  removeBooking: (id) =>
    set((state) => ({
      bookings: state.bookings.filter((b) => b.id !== id),
    })),
}));

// ── Wizard Field Schema ──────────────────────────────────────────────────────
// Defined by the page that owns the form; AIBrain reads this generically.
export interface WizardField {
  id: string;          // matches the form input's field name
  label: string;       // the form label shown to the user (e.g. "Departure Date")
  question: string;    // what the AI asks
  emoji?: string;
  // chips can be static or a fn receiving already-collected data (e.g. endDate uses startDate)
  chips?: Array<{ label: string; value: string }> | ((collected: Record<string, any>) => Array<{ label: string; value: string }>);
  parse: (text: string, collected: Record<string, any>) => string | number;
  confirm: (value: any) => string;
}

/** Queued auto-send when AI Brain opens (e.g. planner “Ask AI”). */
export interface PendingOutboundMessage {
  text: string;
  /** Model uses six-header destination snapshot + search grounding (see `/api/ai-brain`). */
  destinationBriefFormat?: boolean;
}

// ────────────────────────────────────────────────
// AI Brain Store (separate slice for performance)
// ────────────────────────────────────────────────
interface AIBrainState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isOpen: boolean;
  isPrimarySidebarOpen: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (chunk: string) => void;
  finalizeLastMessage: () => void;
  setStreaming: (v: boolean) => void;
  setOpen: (v: boolean) => void;
  setPrimarySidebarOpen: (v: boolean) => void;
  togglePrimarySidebar: () => void;
  clearHistory: () => void;
  // Wizard state
  wizardStep: string | null;
  wizardData: Record<string, any>;
  setWizardStep: (v: string | null) => void;
  setWizardData: (v: Record<string, any>) => void;
  // Registered callback from the planner page so AIBrain can fill form fields
  inputUpdateHandler: ((field: string, value: string | number) => void) | null;
  registerInputUpdateHandler: (handler: ((field: string, value: string | number) => void) | null) => void;
  // Wizard schema: field definitions owned by the page, read by AIBrain
  wizardSchema: WizardField[];
  registerWizardSchema: (schema: WizardField[]) => void;
  // Wizard mode: conversational Q&A to collect planner inputs
  isWizardMode: boolean;
  setWizardMode: (v: boolean) => void;
  /** When set and the chat opens (and not busy), AIBrain sends this via `/api/ai-brain`. */
  pendingOutbound: PendingOutboundMessage | null;
  setPendingOutbound: (v: PendingOutboundMessage | null) => void;
}

export const useAIBrainStore = create<AIBrainState>((set) => ({
  messages: [],
  isStreaming: false,
  isOpen: false,
  isPrimarySidebarOpen: false,
  wizardStep: null,
  wizardData: {},
  setWizardStep: (wizardStep) => set({ wizardStep }),
  setWizardData: (wizardData) => set({ wizardData }),
  inputUpdateHandler: null,
  wizardSchema: [],
  pendingOutbound: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, { ...msg, timestamp: Date.now() }] })),

  // Called repeatedly during a stream to append tokens
  updateLastMessage: (chunk) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;
      const last = msgs[msgs.length - 1];
      
      // Real-time terminology scrubbing (Gold Standard Branding)
      const scrubbedChunk = chunk
        .replace(/Premium/g, 'High-value')
        .replace(/premium/g, 'high-value')
        .replace(/Elite/g, 'Top-tier')
        .replace(/elite/g, 'top-tier');
        
      msgs[msgs.length - 1] = { ...last, content: last.content + scrubbedChunk, isStreaming: true };
      return { messages: msgs };
    }),

  finalizeLastMessage: () =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], isStreaming: false };
      return { messages: msgs };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setOpen: (isOpen) => set({ isOpen }),
  setPrimarySidebarOpen: (isPrimarySidebarOpen) => set({ isPrimarySidebarOpen }),
  togglePrimarySidebar: () => set((state) => ({ isPrimarySidebarOpen: !state.isPrimarySidebarOpen })),
  clearHistory: () => set({ 
    messages: [], 
    wizardStep: null, 
    wizardData: {}, 
    isWizardMode: false,
    pendingOutbound: null 
  }),
  registerInputUpdateHandler: (handler) => set({ inputUpdateHandler: handler }),
  registerWizardSchema: (wizardSchema) => set({ wizardSchema }),
  isWizardMode: false,
  setWizardMode: (isWizardMode) => set({ isWizardMode }),
  setPendingOutbound: (pendingOutbound) => set({ pendingOutbound }),
}));

// ────────────────────────────────────────────────
// Trip Planner Store — shared real-time plan state
// Used by AIBrain (context) + WhatsApp push
// ────────────────────────────────────────────────
export interface TierSummary {
  id?: string;
  label: string;
  total: string;
  totalNum: number;
  transport: { name: string; price: string; label: string; detail: string };
  hotel: { name: string; price: string; label: string; detail: string };
  local: { name: string; price: string; label: string; detail: string };
}

export interface ActiveItinerary {
  destination: string;
  duration: string;
  totalEstimate: string;
  bestTime: string;
  dayPlan: {
    day: number;
    title: string;
    activities: { time: string; activity: string; cost?: string }[];
  }[];
  passengers?: Array<{
    type: 'adult' | 'kid';
    name: string;
    gender?: 'M' | 'F' | 'O';
    age?: number;
    id_proof?: string;
  }>;
  safety: {
    score?: string;
    tips: string[];
  };
  weather?: {
    temp?: string;
    condition?: string;
    tip?: string;
  };
  tierLabel: string;
  from: string;
  to: string;
  startDate: string;
  endDate: string;
  nights: number;
  total: string;
  totalNum: number;
  transport: { name: string; price: string; label: string; detail: string };
  hotel: { name: string; price: string; label: string; detail: string };
  local: { name: string; price: string; label: string; detail: string };
  // Detailed lists for /my-trip elaborate view
  hotelsList?: Array<{ name: string; tier: string; price: string; rating: string; highlights: string }>;
  transportList?: Array<{ mode: string; from: string; detail: string; price: string; duration: string }>;
  foodSpotsList?: Array<{ name: string; cuisine: string; type: string; must: string }>;
  adults: number;
  kids: number;
  discovery?: {
    culinary: { name: string; desc: string }[];
    heritage: { name: string; desc: string }[];
    vibe: { name: string; desc: string }[];
    transport: { name: string; desc: string }[];
    night: { name: string; desc: string }[];
    nature: { name: string; desc: string }[];
  };
}

interface TripPlannerState {
  tiers: TierSummary[];
  activeItinerary: ActiveItinerary | null;
  searchData: {
    trains: any[];
    flights: any[];
    hotels: any[];
    buses: any[];
    taxis: any[];
    ferries: any[];
  };
  activeStep: 'tiers' | 'selection' | 'confirmed';
  plannerStage: 'inputs' | 'suggestions' | 'planning' | 'results' | 'selection' | 'booking' | 'success';
  selectedPlan: TierSummary | null;
  hotelTier: 'recommended' | 'economy' | 'premium' | null;
  mixPicks: { transport: any; returnTransport: any; hotel: any; local: any };
  weather: any | null;
  activeBookingId: string | null;
  isProfileOpen: boolean;
  setTiers: (tiers: TierSummary[]) => void;
  setActiveItinerary: (itinerary: ActiveItinerary | null) => void;
  setSearchData: (data: Partial<TripPlannerState['searchData']>) => void;
  setActiveStep: (step: 'tiers' | 'selection' | 'confirmed') => void;
  setSelectedPlan: (plan: TierSummary | null) => void;
  setMixPicks: (picks: Partial<TripPlannerState['mixPicks']>) => void;
  setHotelTier: (tier: TripPlannerState['hotelTier']) => void;
  setPlannerStage: (stage: TripPlannerState['plannerStage']) => void;
  setWeather: (weather: any | null) => void;
  setActiveBookingId: (id: string | null) => void;
  setIsProfileOpen: (isOpen: boolean) => void;
  clearPlan: () => void;
}

import { persist } from 'zustand/middleware';

const PLANNER_STAGE_ORDER: TripPlannerState['plannerStage'][] = [
  'inputs',
  'suggestions',
  'planning',
  'results',
  'selection',
  'booking',
  'success',
];

function plannerStageRank(stage: TripPlannerState['plannerStage']): number {
  const i = PLANNER_STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

export const useTripPlannerStore = create<TripPlannerState>()(
  persist(
    (set) => ({
      tiers: [],
      activeItinerary: null,
      activeStep: 'tiers',
      plannerStage: 'inputs',
      selectedPlan: null,
      hotelTier: null,
      mixPicks: { transport: null, returnTransport: null, hotel: null, local: null },
      searchData: { trains: [], flights: [], hotels: [], buses: [], taxis: [], ferries: [] },
      weather: null,
      activeBookingId: null,
      isProfileOpen: false,

      setTiers: (tiers) => set({ tiers }),
      setActiveItinerary: (activeItinerary) => set({ activeItinerary }),
      setSearchData: (data) =>
        set((state) => ({ searchData: { ...state.searchData, ...data } })),
      setActiveStep: (activeStep) => set({ activeStep }),
      setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
      setMixPicks: (mixPicks) => set((state) => ({ mixPicks: { ...state.mixPicks, ...mixPicks } })),
      setHotelTier: (hotelTier) => set({ hotelTier }),
      setPlannerStage: (plannerStage) => set({ plannerStage }),
      setWeather: (weather) => set({ weather }),
      setActiveBookingId: (activeBookingId) => set({ activeBookingId }),
      setIsProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
      clearPlan: () =>
        set({ 
          tiers: [], 
          activeItinerary: null, 
          activeStep: 'tiers',
          plannerStage: 'inputs',
          selectedPlan: null,
          hotelTier: null,
          mixPicks: { transport: null, returnTransport: null, hotel: null, local: null },
          searchData: { trains: [], flights: [], hotels: [], buses: [], taxis: [], ferries: [] },
          weather: null,
          activeBookingId: null,
          isProfileOpen: false
        }),
    }),
    {
      name: 'yatra_active_trip',
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<TripPlannerState> | undefined;
        if (!p || typeof p !== 'object') return currentState as TripPlannerState;

        const persistedStage = (p.plannerStage ?? 'inputs') as TripPlannerState['plannerStage'];

        // A completed booking ('success') should never be restored on the next visit.
        // Reset everything to a clean inputs state so the user always starts fresh.
        if (persistedStage === 'success') {
          return {
            ...(currentState as TripPlannerState),
            plannerStage: 'inputs',
            tiers: [],
            activeItinerary: null,
            activeStep: 'tiers',
            selectedPlan: null,
            mixPicks: { transport: null, returnTransport: null, hotel: null, local: null },
            searchData: { trains: [], flights: [], hotels: [], buses: [], taxis: [], ferries: [] },
            activeBookingId: null,
          };
        }

        const pr = plannerStageRank(persistedStage);
        const cr = plannerStageRank(currentState.plannerStage);

        // Async rehydrate must not overwrite an in-flight session that already advanced (race on fast flows).
        if (cr > pr) {
          return currentState as TripPlannerState;
        }

        return {
          ...(currentState as TripPlannerState),
          ...p,
          plannerStage: persistedStage,
          searchData: {
            ...(currentState as TripPlannerState).searchData,
            ...(p.searchData ?? {}),
          },
          mixPicks: {
            ...(currentState as TripPlannerState).mixPicks,
            ...(p.mixPicks ?? {}),
          },
        };
      },
    }
  )
);


// ────────────────────────────────────────────────────────────────────────────
// Tour Guide Store — single shared trip state for Yatra ↔ Tour Guide sync
// Every field here maps 1-to-1 with the Tour Guide spec.
// Both panels read and write this store; neither holds its own duplicate state.
// ────────────────────────────────────────────────────────────────────────────
export type TourGuidePreference =
  | 'family' | 'romantic' | 'adventure' | 'luxury' | 'spiritual'
  | 'food' | 'nature' | 'nightlife' | 'shopping'
  | 'mountains' | 'beaches' | 'cultural' | 'pilgrimage' | 'jungle' | 'monuments' | 'riverside';

export type TourGuideFeature =
  | 'hotel_included' | 'flights_included' | 'guided_tours'
  | 'private_car' | 'meals' | 'visa_help' | 'sightseeing_passes'
  | 'sustainable';

export interface TourCard {
  id: string;
  title: string;
  destination: string;
  duration: string;
  estimatedBudget: string;   // e.g. "₹45,000 – ₹60,000"
  highlights: string[];
  matchReason: string;
  rank: number;
}

export interface TourGuideState {
  // ── Shared trip fields (Tour Guide spec) ──────────────────────────────────
  language: string;                         // e.g. 'en', 'hi', 'ta'
  from_city: string;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  budget: number;                           // numeric, same as targetBudget
  party_size: {
    adults: number;
    kids: number;
  };
  preferences: TourGuidePreference[];
  features: TourGuideFeature[];
  trip_style: string;                       // e.g. 'leisure', 'adventure'
  constraints: string;                      // free-text constraints
  discovered_tours: TourCard[];
  selected_tour: TourCard | null;
  conversation_summary: string;
  planner_stage: string;                    // e.g. 'inputs', 'selection', 'booking'
  mix_picks: any;                           // selected flight/train/hotel
  telegramId: string;                            // Telegram ID or phone number
  telegramEnabled: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  patchTourGuide: (patch: Partial<Omit<TourGuideState, 'patchTourGuide' | 'resetTourGuide' | 'setDiscoveredTours' | 'selectTour'>>) => void;
  setDiscoveredTours: (tours: TourCard[]) => void;
  selectTour: (tour: TourCard | null) => void;
  resetTourGuide: () => void;
}

const TOUR_GUIDE_DEFAULTS: Omit<TourGuideState, 'patchTourGuide' | 'resetTourGuide' | 'setDiscoveredTours' | 'selectTour'> = {
  language: 'en',
  from_city: '',
  destination: '',
  departure_date: null,
  return_date: null,
  budget: 50000,
  party_size: { adults: 1, kids: 0 },
  preferences: [],
  features: [],
  trip_style: 'leisure',
  constraints: '',
  discovered_tours: [],
  selected_tour: null,
  conversation_summary: '',
  planner_stage: 'inputs',
  mix_picks: {},
  telegramId: '',
  telegramEnabled: false,
};

export const useTourGuideStore = create<TourGuideState>()(
  persist(
    (set) => ({
      ...TOUR_GUIDE_DEFAULTS,

      patchTourGuide: (patch) => set((state) => ({ ...state, ...patch })),
      setDiscoveredTours: (tours) => set({ discovered_tours: tours }),
      selectTour: (tour) => set({ selected_tour: tour }),
      resetTourGuide: () => set(TOUR_GUIDE_DEFAULTS),
    }),
    { name: 'yatra_tour_guide' }
  )
);
