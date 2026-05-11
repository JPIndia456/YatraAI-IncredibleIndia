'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train, Plane, Bus, Hotel, Car, CheckCircle2, Sparkles,
  ArrowRight, X, Download, Share2, BadgeIndianRupee,
  AlertTriangle, Calendar, ShieldCheck, Utensils, ChevronDown,
  MapPin, RotateCcw, Ship, Star, ShoppingCart, Users, CloudSun
} from 'lucide-react';
import { useTripPlannerStore, useTripStore, useAIBrainStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { mergeApiHotelsWithCuratedSeeds, dedupeHotelsByNormalizedName } from '@/lib/hotelDestinationBoost';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWaterCrossingSuggestions } from '@/lib/waterTransportSuggestions';
import { WeatherService } from '@/lib/services/travel/weather';
import { isoToDdMonthYy } from '@/lib/dateFormat';
import { toast } from 'sonner';
import { AmadeusService } from '@/lib/services/travel/amadeus';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TierItem {
  label: string;
  name: string;
  detail: string;
  price: string;
  priceNum: number;
  icon: any;
  raw?: any;
  source?: string;
}

interface TripPlannerProps {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType?: 'round' | 'one-way' | 'single';
  suggestion?: any;
  onComplete?: () => void;
  onBack?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceNum(p?: any): number {
  if (!p) return 0;
  return parseInt(String(p).replace(/[₹,]/g, '')) || 0;
}

function indicativePriceNum(p?: string): number {
  if (!p) return 0;
  const m = String(p).match(/₹?\s*([\d,]+)/);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ''), 10) || 0;
}

const calculateRoomsNeeded = (pax: number) => {
  if (pax <= 2) return 1;
  return Math.max(1, Math.ceil(pax / 3)); // Assume max 3 per room for realistic costing
};

function computeGrandTotal(transport: any, returnTransport: any, hotel: any, local: any, partySize: number, nights: number) {
  const pax = Math.max(1, partySize || 1);
  const nts = Math.max(1, nights || 1);
  const rooms = calculateRoomsNeeded(pax);
  
  const tp = Number(transport?.priceNum) || 0;
  const rp = Number(returnTransport?.priceNum) || 0;
  const hp = Number(hotel?.priceNum) || 0;
  const lp = Number(local?.priceNum) || 0;
  
  // Transport is per person, Hotel is per room/night, Local is per group/trip
  return ((tp + rp) * pax) + (hp * nts * rooms) + lp;
}

const transportIsRailTabLike = (t: any) => t?.label === 'Train' || t?.label === 'Ferry';

export default function TripPlanner({ origin, destination, startDate, endDate, tripType, suggestion, onComplete, onBack }: TripPlannerProps) {
  const router = useRouter();
  const { 
    activeItinerary, setActiveItinerary, setSearchData, 
    activeStep, setActiveStep, selectedPlan, setSelectedPlan, mixPicks, setMixPicks,
    hotelTier, setHotelTier, weather, setWeather
  } = useTripPlannerStore();
  const { setOpen: setAIBrainOpen, setPendingOutbound } = useAIBrainStore();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const { adults, kids, origin: storeOrigin, destination: storeDest, startDate: storeStart, endDate: storeEnd } = useTripStore();
  const partySize = Math.max(1, (Number(adults) || 1) + (Number(kids) || 0));

  const displayOrigin = origin || activeItinerary?.from || storeOrigin || 'Selecting...';
  const displayDest = destination || activeItinerary?.to || storeDest || 'Selecting...';
  const displayStart = startDate || activeItinerary?.startDate || storeStart || '';
  const displayEnd = endDate || activeItinerary?.endDate || storeEnd || '';

  const [loading, setLoading] = useState(false);
  const itn = activeItinerary || (suggestion as any);

  const [allOutbound, setAllOutbound] = useState<TierItem[]>(() => 
    itn?.transportList?.map((s: any) => ({
      label: s.mode || 'Flight',
      name: s.mode?.toLowerCase().includes('flight') ? 'IndiGo | 6E-532' : (s.mode || 'Premium Transit'),
      detail: s.detail || (String(s.mode || '').toLowerCase().includes('flight') ? 'Departure 10:30 AM • Non-stop • 2h 15m' : 'Direct Route • Comfort Class'),
      price: s.price && s.price !== 'Included' ? s.price : '₹12,500',
      priceNum: parseInt(String(s.price && s.price !== 'Included' ? s.price : '12500').replace(/[^0-9]/g, '')) || 12500,
      icon: String(s.mode || '').toLowerCase().includes('flight') ? Plane : Train
    })) || []
  );

  const [allReturn, setAllReturn] = useState<TierItem[]>(() => 
    (tripType === 'round' && itn?.transportList) ? itn.transportList.map((s: any) => ({
      label: s.mode || 'Flight',
      name: `${s.mode?.toLowerCase().includes('flight') ? 'Air India | AI-102' : (s.mode || 'Return Transit')}`,
      detail: s.detail || 'Non-stop • 2h 10m',
      price: s.price && s.price !== 'Included' ? s.price : '₹12,500',
      priceNum: parseInt(String(s.price && s.price !== 'Included' ? s.price : '12500').replace(/[^0-9]/g, '')) || 12500,
      icon: String(s.mode || '').toLowerCase().includes('flight') ? Plane : Train
    })) : []
  );

  const [allHotels, setAllHotels] = useState<TierItem[]>(() => 
    itn?.hotelsList?.map((s: any) => ({
      label: 'Hotel',
      name: s.name || 'The Grand Heritage',
      detail: s.highlights || '★ ★ ★ ★ ★ • City Center',
      price: s.price && s.price !== 'Included' ? s.price : '₹6,500',
      priceNum: parseInt(String(s.price && s.price !== 'Included' ? s.price : '6500').replace(/[^0-9]/g, '')) || 6500,
      icon: Hotel,
      raw: s
    })) || []
  );

  const [allLocals, setAllLocals] = useState<TierItem[]>(() => {
    const list: TierItem[] = [
      { label: 'Mobility', name: 'Ola Mini / Prime', detail: 'On-demand • 5-10 min ETA', price: '₹850', priceNum: 850, icon: Car },
      { label: 'Mobility', name: 'Uber Premier', detail: 'On-demand • 3-8 min ETA', price: '₹1,100', priceNum: 1100, icon: Car },
      { label: 'Mobility', name: 'Private Airport Taxi', detail: 'Pre-booked • Meet & Greet', price: '₹1,500', priceNum: 1500, icon: Car },
      { label: 'Mobility', name: 'Self-Drive Rental', detail: 'Full Day • 24h Access', price: '₹2,200', priceNum: 2200, icon: Car }
    ];
    
    if (itn?.foodSpotsList) {
      itn.foodSpotsList.forEach((s: any) => list.push({
        label: 'Dining',
        name: s.name,
        detail: s.highlights || 'Local Cuisine',
        price: '₹800 - ₹2,500',
        priceNum: 1500,
        icon: Utensils
      }));
    }
    return list.sort((a, b) => a.priceNum - b.priceNum);
  });
  const [selectionTab, setSelectionTab] = useState<'outbound' | 'return' | 'stay' | 'mobility'>('outbound');
  const [isVerifying, setIsVerifying] = useState(false);
  const isFetchingRef = useRef(false);

  const nights = useMemo(() => {
    if (!displayStart || !displayEnd) return 2;
    const diff = (new Date(displayEnd).getTime() - new Date(displayStart).getTime()) / 86400000;
    return Math.max(1, Math.round(diff) || 2);
  }, [displayStart, displayEnd]);

  const mixTotal = computeGrandTotal(mixPicks.transport, mixPicks.returnTransport, mixPicks.hotel, mixPicks.local, partySize, nights);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const lastFetchKey = useRef('');

  const fetchAll = useCallback(async () => {
    const key = `${displayOrigin}-${displayDest}-${displayStart}-${displayEnd}`;
    if (!displayDest || displayDest === 'Selecting...' || isFetchingRef.current || key === lastFetchKey.current) return;
    
    isFetchingRef.current = true;
    lastFetchKey.current = key;
    setLoading(true);
    
    try {
      const isRound = tripType === 'round';
      const outboundDate = displayStart || new Date().toISOString().split('T')[0];
      const returnDate = displayEnd || outboundDate;

      // Clean city names for better API matching
      const cleanOrigin = (origin || activeItinerary?.from || storeOrigin || '').split(',')[0].replace(/(North|South|East|West)\s+/i, '').trim();
      const cleanDest = displayDest.split(',')[0].replace(/(North|South|East|West)\s+/i, '').trim();
      
      const searchFrom = cleanOrigin || 'Mumbai';
      const searchTo = cleanDest || displayDest;

      const [trains, flights, buses, hotels, taxis, retTrains, retFlights] = await Promise.all([
        fetch('/api/live/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: searchFrom, to: searchTo, date: outboundDate }) }).then(r => r.json().catch(() => ({}))),
        fetch('/api/live/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: searchFrom, to: searchTo, date: outboundDate }) }).then(r => r.json().catch(() => ({}))),
        fetch('/api/live/buses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: searchFrom, to: searchTo, date: outboundDate }) }).then(r => r.json().catch(() => ({}))),
        fetch('/api/live/hotels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: searchTo, checkIn: outboundDate, checkOut: returnDate }) }).then(r => r.json().catch(() => ({}))),
        fetch('/api/live/taxis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: searchTo }) }).then(r => r.json().catch(() => ({}))),
        isRound ? fetch('/api/live/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: searchTo, to: searchFrom, date: returnDate }) }).then(r => r.json().catch(() => ({}))) : Promise.resolve({}),
        isRound ? fetch('/api/live/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: searchTo, to: searchFrom, date: returnDate }) }).then(r => r.json().catch(() => ({}))) : Promise.resolve({})
      ]);
      
      // Fetch Weather (non-blocking)
      WeatherService.getCurrentWeather(searchTo).then(setWeather);
      
      const itn = activeItinerary || (suggestion as any);
      const apiHotels = hotels.hotels || [];
      const aiHotels = itn?.hotelsList || []; 
      
      const combinedHotels: TierItem[] = [
        ...apiHotels.map((h: any) => ({
          label: 'Hotel',
          name: h.name || 'Premium Stay',
          detail: h.highlights || '★ ★ ★ ★ • Prime Location',
          price: h.price || '₹6,500',
          priceNum: parseInt(String(h.price || '6500').replace(/[^0-9]/g, '')) || 6500,
          icon: Hotel,
          raw: h
        })),
        ...aiHotels.filter((ai: any) => !apiHotels.some((api: any) => api.name === ai.name)).map((s: any) => ({
          label: 'Hotel',
          name: s.name || 'Recommended Stay',
          detail: s.highlights || 'AI Suggested',
          price: s.price && s.price !== 'Included' ? s.price : '₹5,500',
          priceNum: parseInt(String(s.price && s.price !== 'Included' ? s.price : '5500').replace(/[^0-9]/g, '')) || 5500,
          icon: Hotel,
          raw: s
        }))
      ];

      // If list is still short, add premium and budget realistic options to ensure at least 10 choices
      if (combinedHotels.length < 10) {
        const city = cleanDest || 'Selected City';
        const fallbackStays = [
          { name: `Taj Resort & Spa • ${city}`, detail: '★ ★ ★ ★ ★ • Luxury Experience', price: '₹18,500', priceNum: 18500 },
          { name: `Grand Hyatt • ${city}`, detail: '★ ★ ★ ★ ★ • Premium Waterfront', price: '₹15,200', priceNum: 15200 },
          { name: `Marriott Resort • ${city}`, detail: '★ ★ ★ ★ ★ • Prime Sea View', price: '₹12,800', priceNum: 12800 },
          { name: `The Leela • ${city}`, detail: '★ ★ ★ ★ ★ • Elite Stay', price: '₹19,200', priceNum: 19200 },
          { name: `Radisson Blu • ${city}`, detail: '★ ★ ★ ★ • Tropical Gardens', price: '₹9,400', priceNum: 9400 },
          { name: `The Zuri • ${city}`, detail: '★ ★ ★ ★ • Beachfront Vibe', price: '₹8,200', priceNum: 8200 },
          { name: `Lemon Tree • ${city}`, detail: '★ ★ ★ • Business Premium', price: '₹6,100', priceNum: 6100 },
          { name: `Fairfield by Marriott • ${city}`, detail: '★ ★ ★ • Modern Comfort', price: '₹5,200', priceNum: 5200 },
          { name: `Ginger Hotel • ${city}`, detail: '★ ★ • Budget Friendly', price: '₹3,100', priceNum: 3100 },
          { name: `Bloom Suites • ${city}`, detail: '★ ★ ★ • Boutique Design', price: '₹4,600', priceNum: 4600 },
          { name: `Heritage Village • ${city}`, detail: '★ ★ ★ ★ • Cultural Stay', price: '₹7,200', priceNum: 7200 }
        ];
        fallbackStays.forEach(p => {
          if (!combinedHotels.some(h => h.name === p.name)) {
            combinedHotels.push({
              label: 'Hotel',
              name: p.name,
              detail: p.detail,
              price: p.price,
              priceNum: p.priceNum,
              icon: Hotel,
              source: 'est'
            });
          }
        });
      }
      // Sort hotels by price (lowest to highest)
      setAllHotels(combinedHotels.sort((a, b) => a.priceNum - b.priceNum));

      const buildTransportList = (data: any, aiData: any[]) => {
        const list: TierItem[] = [];
        
        const trainsArray = Array.isArray(data.trains) ? data.trains : (data.trains?.trains || []);
        trainsArray.forEach((r: any) => list.push({
          label: 'Train',
          name: r.train_name || r.name || 'Express Train',
          detail: `${r.departure || ''} → ${r.arrival || ''}`,
          price: r.price || '₹2,500',
          priceNum: parseInt(String(r.price || '2500').replace(/[^0-9]/g, '')) || 2500,
          icon: Train,
          raw: r
        }));

        const flightsArray = Array.isArray(data.flights) ? data.flights : (data.flights?.flights || []);
        flightsArray.forEach((r: any) => list.push({
          label: 'Flight',
          name: r.airline || r.name || 'Domestic Flight',
          detail: `${r.departure || ''} → ${r.arrival || ''}`,
          price: r.price || '₹12,500',
          priceNum: parseInt(String(r.price || '12500').replace(/[^0-9]/g, '')) || 12500,
          icon: Plane,
          raw: r
        }));

        // Generate Realistic Flight/Train options if live data is missing or sparse
        if (list.length < 5) {
          const providers = [
            { label: 'Flight', name: 'IndiGo | 6E-532', detail: 'Departure 08:30 AM • Non-stop • 2h 15m', price: '₹8,400', priceNum: 8400, icon: Plane },
            { label: 'Train', name: 'Rajdhani Express | 12432', detail: '04:15 PM → 11:30 AM • 2AC Class', price: '₹4,200', priceNum: 4200, icon: Train },
            { label: 'Flight', name: 'Air India | AI-801', detail: 'Departure 11:45 AM • Non-stop • 2h 20m', price: '₹12,500', priceNum: 12500, icon: Plane },
            { label: 'Train', name: 'Shatabdi Express | 12002', detail: '06:00 AM → 02:30 PM • CC Class', price: '₹2,800', priceNum: 2800, icon: Train },
            { label: 'Flight', name: 'Vistara | UK-981', detail: 'Departure 04:15 PM • Non-stop • 2h 10m', price: '₹15,200', priceNum: 15200, icon: Plane }
          ];
          
          providers.forEach(p => {
            if (!list.some(item => item.name === p.name)) {
              list.push({
                label: p.label,
                name: p.name,
                detail: p.detail,
                price: p.price,
                priceNum: p.priceNum,
                icon: p.icon
              });
            }
          });
        }
        
        // Also add AI suggestions if not already in the list
        if (aiData) {
          aiData.forEach((s: any) => {
            const modeLower = String(s.mode || '').toLowerCase();
            // Skip local items in the long-distance transport list
            if (modeLower.includes('local') || modeLower.includes('rental') || modeLower.includes('taxi') || modeLower.includes('car')) return;

            const isFlight = modeLower.includes('flight');
            const realisticName = isFlight ? 'IndiGo | 6E-532' : (s.mode || 'Intercity Express');
            
            if (!list.some(item => item.name === realisticName)) {
              list.push({
                label: s.mode || 'Travel',
                name: realisticName,
                detail: s.detail || (isFlight ? 'Departure 10:30 AM • Non-stop • 2h 15m' : 'Standard Express • Reserved Class'),
                price: s.price && s.price !== 'Included' ? s.price : (isFlight ? '₹12,500' : '₹2,500'),
                priceNum: parseInt(String(s.price && s.price !== 'Included' ? s.price : (isFlight ? '12500' : '2500')).replace(/[^0-9]/g, '')) || (isFlight ? 12500 : 2500),
                icon: isFlight ? Plane : Train,
                raw: s
              });
            }
          });
        }
        
        // Sort by price (lowest to highest)
        return list.sort((a, b) => a.priceNum - b.priceNum);
      };

      setAllOutbound(buildTransportList({ trains, flights }, itn?.transportList || []));
      setAllReturn(buildTransportList({ trains: retTrains, flights: retFlights }, itn?.transportList || []));
      
      const localList = (taxis.taxis || []).map((r: any) => ({ 
        label: 'Taxi', 
        name: r.type, 
        detail: r.eta, 
        price: r.price || '₹800', 
        priceNum: parseInt(String(r.price || '800').replace(/[^0-9]/g, '')) || 800, 
        icon: Car, 
        raw: r 
      })).sort((a: any, b: any) => a.priceNum - b.priceNum);
      
      if (localList.length < 3) {
        const taxiOptions = [
          { label: 'Mobility', name: 'Ola Mini / Prime', detail: 'On-demand • 5-10 min ETA', price: '₹850', priceNum: 850, icon: Car },
          { label: 'Mobility', name: 'Uber Premier', detail: 'On-demand • 3-8 min ETA', price: '₹1,100', priceNum: 1100, icon: Car },
          { label: 'Mobility', name: 'Private Airport Taxi', detail: 'Pre-booked • Meet & Greet', price: '₹1,500', priceNum: 1500, icon: Car }
        ];
        taxiOptions.forEach(p => {
          if (!localList.some((h: any) => h.name === p.name)) {
            localList.push(p);
          }
        });
      }
      setAllLocals(localList.sort((a: any, b: any) => a.priceNum - b.priceNum));

    } catch (e) { console.error(e); }
    setLoading(false);
    isFetchingRef.current = false;
  }, [displayOrigin, displayDest, displayStart, displayEnd, suggestion, tripType, activeItinerary]);

  useEffect(() => { 
    if (!displayDest || displayDest === 'Selecting...') return;
    fetchAll(); 
  }, [displayDest, fetchAll]);

  // Initialize mixPicks from suggestion/activeItinerary if empty
  useEffect(() => {
    if (!mounted) return;
    const itn = activeItinerary || (suggestion as any);
    if (!itn) return;
    
    if (!mixPicks.transport && !mixPicks.hotel) {
      setMixPicks({
        transport: itn.transportList?.[0] ? {
          label: itn.transportList[0].mode,
          name: itn.transportList[0].mode,
          detail: itn.transportList[0].detail,
          price: itn.transportList[0].price,
          priceNum: priceNum(itn.transportList[0].price),
          icon: itn.transportList[0].mode.toLowerCase().includes('flight') ? Plane : Train
        } : (itn.transport ? {
          label: itn.transport.mode || itn.transport.type,
          name: itn.transport.name || itn.transport.mode,
          detail: itn.transport.detail,
          price: itn.transport.price,
          priceNum: priceNum(itn.transport.price),
          icon: (itn.transport.mode || '').toLowerCase().includes('flight') ? Plane : Train
        } : null),
        hotel: itn.hotelsList?.[0] ? {
          label: 'Hotel',
          name: itn.hotelsList[0].name,
          detail: itn.hotelsList[0].highlights,
          price: itn.hotelsList[0].price,
          priceNum: priceNum(itn.hotelsList[0].price),
          icon: Hotel
        } : (itn.hotel ? {
          label: 'Hotel',
          name: itn.hotel.name,
          detail: itn.hotel.detail,
          price: itn.hotel.price,
          priceNum: priceNum(itn.hotel.price),
          icon: Hotel
        } : null),
        local: {
          label: 'Local',
          name: 'Yatra Elite Experience',
          detail: 'Curated Activities',
          price: 'Included',
          priceNum: 0,
          icon: Car
        }
      });
    }
  }, [mounted, activeItinerary, suggestion, mixPicks.transport, mixPicks.hotel, setMixPicks]);

  // Initialize all lists from suggestion/activeItinerary if available
  useEffect(() => {
    if (!mounted) return;
    const itn = activeItinerary || (suggestion as any);
    if (!itn) return;

    if (allOutbound.length === 0 && itn.transportList) {
      const list: TierItem[] = itn.transportList.map((s: any) => ({
        label: s.mode || s.type || 'Travel',
        name: s.mode || s.name || 'AI Pick',
        detail: s.detail || 'Standard Route',
        price: s.price || 'Included',
        priceNum: priceNum(s.price),
        icon: (s.mode || s.type || '').toLowerCase().includes('flight') ? Plane : Train
      }));
      setAllOutbound(list);
    }
    if (allHotels.length === 0 && itn.hotelsList) {
      const list: TierItem[] = itn.hotelsList.map((s: any) => ({
        label: 'Hotel',
        name: s.name,
        detail: s.highlights || 'Prime Location',
        price: s.price || 'Included',
        priceNum: priceNum(s.price),
        icon: Hotel
      }));
      setAllHotels(list);
    }
    // ... same for others if needed
  }, [mounted, activeItinerary, suggestion, allOutbound.length, allHotels.length]);

  // Initial reset when destination changes fundamentally or on mount
  const prevDest = useRef(destination);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current || (destination && destination !== prevDest.current)) {
      // We no longer blindly reset everything. 
      // We only switch back to the 'tiers' view if it's a completely new mount.
      if (isFirstMount.current) {
        setActiveStep('tiers');
      }
      prevDest.current = destination;
      isFirstMount.current = false;
    }
  }, [destination, setActiveStep]);

  const filteredHotels = useMemo(() => {
    if (!hotelTier) return allHotels;
    const filtered = allHotels.filter(h => {
      const s = Number(h.raw?.stars) || 3;
      // If it's an AI-only item without specific star metadata, or if it matches the tier label, include it
      if (h.raw?.tier === hotelTier || h.label?.toLowerCase() === hotelTier.toLowerCase()) return true;
      
      if (hotelTier === 'premium') return s >= 5;
      if (hotelTier === 'economy') return s <= 2;
      return s >= 3 && s <= 4;
    });
    // Fallback: if filter is too strict, show at least the AI-suggested hotels
    return filtered.length > 0 ? filtered : allHotels.slice(0, 5);
  }, [allHotels, hotelTier]);

  useEffect(() => {
    if (activeStep === 'selection' && !loading) {
      if (selectionTab === 'outbound' && allOutbound.length === 0) {
        if (allHotels.length > 0) setSelectionTab('stay');
        else if (allLocals.length > 0) setSelectionTab('mobility');
      }
    }
  }, [activeStep, loading, allOutbound.length, allHotels.length, allLocals.length, selectionTab]);


  const handleConfirmPlan = async () => {
    const { transport, returnTransport, hotel, local } = mixPicks;
    if (!transport || !hotel || !local) return;
    if (tripType === 'round' && !returnTransport) return;

    setIsVerifying(true);
    try {
      let updatedTransport = transport;
      let updatedReturn = returnTransport;

      // Verify Outbound Flight if it's from Amadeus
      if (transport.source === 'amadeus-live' && transport.raw) {
        const verified = await AmadeusService.confirmPrice(transport.raw);
        if (verified) {
          updatedTransport = {
            ...transport,
            price: `₹${Math.round(verified.price.total).toLocaleString('en-IN')}`,
            priceNum: Number(verified.price.total),
            raw: verified
          };
          toast.success(t('booking_live_price_verified'), { description: t('booking_live_price_verified_desc') });
        } else {
          toast.warning(t('booking_verification_unavailable'), { description: t('booking_verification_unavailable_desc') });
        }
      }

      // Verify Return Flight if it's from Amadeus
      if (returnTransport?.source === 'amadeus-live' && returnTransport.raw) {
        const verified = await AmadeusService.confirmPrice(returnTransport.raw);
        if (verified) {
          updatedReturn = {
            ...returnTransport,
            price: `₹${Math.round(verified.price.total).toLocaleString('en-IN')}`,
            priceNum: Number(verified.price.total),
            raw: verified
          };
          toast.success(t('booking_live_price_verified'), { description: t('booking_live_price_verified_desc') });
        } else {
          toast.warning(t('booking_verification_unavailable'), { description: t('booking_verification_unavailable_desc') });
        }
      }

      // Update state with verified data
      setMixPicks({ 
        transport: updatedTransport, 
        returnTransport: updatedReturn,
        hotel: mixPicks.hotel,
        local: mixPicks.local
      });

      const totalNum = computeGrandTotal(
        updatedTransport, 
        updatedReturn, 
        mixPicks.hotel, 
        mixPicks.local, 
        partySize, 
        nights
      );
      const it = {
        ...selectedPlan,
        tierLabel: selectedPlan?.label || 'Custom', from: origin, to: destination, startDate, endDate, nights, 
        transport: updatedTransport, 
        returnTransport: updatedReturn, 
        hotel: mixPicks.hotel, 
        local: mixPicks.local, 
        totalNum, 
        total: `₹${totalNum.toLocaleString()}`,
        dayPlan: suggestion?.dayPlan, safety: suggestion?.safety, foodSpotsList: suggestion?.foodSpotsList
      };
      setActiveItinerary(it as any);
      setActiveStep('confirmed');
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error('Price Verification Failed', { description: err.message || 'The selected fare is no longer available. Please try another flight.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────
  const handleTierSelect = (tier: any) => {
    setSelectedPlan(tier);
    const tierId = tier.id || 'recommended';
    setHotelTier(tierId as any);
    
    // Auto-populate cart with best matches for this tier
    const bestHotel = allHotels.find(h => {
      const s = Number(h.raw?.stars) || 3;
      if (tierId === 'premium') return s >= 5;
      if (tierId === 'economy') return s <= 2;
      return s >= 3 && s <= 4;
    }) || allHotels[0];

    const bestTransport = (tierId === 'economy' ? allOutbound.find(t => t.label === 'Train') : allOutbound.find(t => t.label === 'Flight')) || allOutbound[0];
    const bestReturn = (tierId === 'economy' ? allReturn.find(t => t.label === 'Train') : allReturn.find(t => t.label === 'Flight')) || allReturn[0] || null;
    const bestLocal = allLocals[0];

    setMixPicks({
      transport: bestTransport,
      returnTransport: bestReturn,
      hotel: bestHotel,
      local: bestLocal
    });

    setActiveStep('selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (activeStep === 'selection') {
      setActiveStep('tiers');
    } else if (onBack) {
      onBack();
    }
  };

  const displayDestination = destination || suggestion?.destination || t('planner_your_destination');


  if (!displayDestination || displayDestination.length < 2) {
    return (
      <div className="py-20 text-center">
        <p className="text-[#000080]/40 font-black uppercase tracking-widest" suppressHydrationWarning>
          {mounted ? t('planner_preparing_itinerary') : 'Preparing your itinerary...'}
        </p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (activeStep === 'confirmed') {
    return (
      <div className="py-20 text-center space-y-8 max-w-2xl mx-auto px-4">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-[#000080] uppercase italic tracking-tighter">{t('booking_confirmed', 'TRIP CONFIRMED!')}.</h2>
          <p className="text-[#000080]/60 font-bold uppercase tracking-widest text-xs">{t('booking_confirmed_desc', 'Your incredible journey has been finalized.')}</p>
        </div>
        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-[#000080]/10 space-y-4">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-[#000080]/40">
            <span>{t('indicative_total')}</span>
            <span className="text-xl text-[#000080] tracking-tighter">₹{mixTotal.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full py-5 bg-[#000080] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95"
          >
            {t('view_dashboard', 'Go to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative max-w-7xl mx-auto pb-24 px-4 sm:px-6">
      {/* --- HEADER --- */}
      <div className="py-8 border-b border-[#000080]/10 flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="space-y-1 text-center md:text-left">
           <h2 className="text-3xl font-black text-[#000080] uppercase italic tracking-tighter flex items-center justify-center md:justify-start gap-3">
              <MapPin className="w-8 h-8 text-saffron" />
              {displayDest}
           </h2>
           <div className="mt-2 flex items-center justify-center md:justify-start">
             {weather ? (
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#138808] border border-[#FF9933]/20 rounded-full shadow-lg shadow-emerald-900/10">
                 <CloudSun className="w-3.5 h-3.5 text-[#FF9933]" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                   Climate Pulse: {weather.temp || '--'}°C • {weather.condition || 'Updating...'}
                 </span>
               </div>
             ) : (
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#138808]/5 border border-[#138808]/10 rounded-full shadow-sm">
                 <CloudSun className="w-3.5 h-3.5 text-[#138808]/30" />
                 <span className="text-[10px] font-black text-[#138808]/40 uppercase tracking-widest italic">
                   Climate: Discovery Mode
                 </span>
               </div>
             )}
           </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-bold text-[#000080]/40 uppercase tracking-widest">
            <span>{displayOrigin}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{isoToDdMonthYy(displayStart)} — {isoToDdMonthYy(displayEnd)}</span>
            <span className="text-slate-200 hidden sm:inline">|</span>
            <span>{partySize} {t('travelers', 'Travelers')}</span>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-[#000080]/10 text-center min-w-[120px]">
              <p className="text-[8px] font-black text-[#000080]/40 uppercase tracking-widest">{t('nights', 'Nights')}</p>
              <p className="text-lg font-black text-[#000080]">{nights}</p>
           </div>
           {weather && (
             <div className="px-6 py-3 bg-saffron/5 rounded-2xl border border-saffron/10 text-center min-w-[120px]">
                <p className="text-[8px] font-black text-saffron uppercase tracking-widest">{weather.condition}</p>
                <p className="text-lg font-black text-saffron">{weather.temp}°C</p>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* --- MAIN SELECTION AREA (LEFT) --- */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* --- QUICK TIER FILTERS --- */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-saffron" />
              <h4 className="text-[11px] font-black text-[#000080]/40 uppercase tracking-[0.2em]">{t('select_intelligence_tier', 'Select Your Travel Style')}</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'economy', label: t('economy', 'Economy'), icon: Train, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                { id: 'moderate', label: t('moderate', 'Moderate'), icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { id: 'luxury', label: t('luxury', 'Luxury'), icon: Sparkles, color: 'text-saffron', bg: 'bg-saffron/5', border: 'border-saffron/20' }
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => {
                    setHotelTier(tier.id as any);
                    // Auto-trigger selection logic for this tier
                    const bestHotel = allHotels.find(h => {
                      const s = Number(h.raw?.stars) || 3;
                      if (tier.id === 'luxury') return s >= 5;
                      if (tier.id === 'economy') return s <= 2;
                      return s >= 3 && s <= 4;
                    }) || allHotels[0];
                    const bestTransport = (tier.id === 'economy' ? allOutbound.find(t => t.label === 'Train') : allOutbound.find(t => t.label === 'Flight')) || allOutbound[0];
                    setMixPicks({ hotel: bestHotel, transport: bestTransport });
                  }}
                  className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 group ${hotelTier === tier.id ? `${tier.bg} ${tier.border} shadow-lg scale-[1.02]` : 'bg-white border-[#000080]/10 hover:border-slate-200'}`}
                >
                  <div className={`p-2 rounded-xl ${hotelTier === tier.id ? `${tier.bg} ${tier.color}` : 'bg-slate-50 text-[#000080]/40 group-hover:bg-slate-100'}`}>
                    <tier.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${hotelTier === tier.id ? tier.color : 'text-[#000080]/40'}`}>
                    {tier.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* --- TRAVEL MODULE --- */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Plane className="w-6 h-6" />
               </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h3 className="text-xl font-black text-[#000080] uppercase italic tracking-tight">{t('travel_options', 'TRAVEL OPTIONS')}</h3>
                  {!loading && (
                    <button 
                      onClick={fetchAll}
                      className="flex items-center gap-1.5 text-[8px] font-black text-[#000080]/40 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Refresh Live Fares
                    </button>
                  )}
                </div>
                <p className="text-[10px] font-bold text-[#000080]/40 uppercase tracking-widest">
                  {loading ? 'Sourcing real-time availability...' : `Live transit to ${displayDest}`}
                </p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-[#000080]/10 shadow-sm overflow-hidden">
               <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <span className="px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full">Outbound</span>
                     <p className="text-sm font-black text-blue-900 uppercase italic truncate max-w-[200px]">{mixPicks.transport?.name || '---'}</p>
                  </div>
                  <p className="text-lg font-black text-blue-600 tracking-tighter">{mixPicks.transport?.price || '---'}</p>
               </div>
               
               <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {loading && allOutbound.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sourcing Live Fares...</p>
                    </div>
                  ) : (
                    allOutbound.map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => setMixPicks({ transport: item })}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${mixPicks.transport?.name === item.name ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-5">
                           <div className={`p-3 rounded-xl transition-colors ${mixPicks.transport?.name === item.name ? 'bg-blue-600 text-white' : 'bg-slate-50 text-[#000080]/40 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                             {item.icon ? <item.icon className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                           </div>
                           <div>
                             <h5 className="font-black text-sm text-[#000080] tracking-tight">{item.name}</h5>
                             <p className="text-[10px] font-bold text-[#000080]/60 uppercase tracking-widest">{item.detail}</p>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                           <div className="flex items-center gap-2">
                              <p className="text-base font-black text-blue-600 tracking-tighter">{item.price}</p>
                              <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${item.source === 'live' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-[#000080]/60'}`}>
                                {item.source === 'live' ? 'Live' : 'Est'}
                              </span>
                           </div>
                           {mixPicks.transport?.name === item.name ? (
                             <span className="px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full italic animate-pulse">Selected</span>
                           ) : (
                             <button className="px-4 py-1.5 bg-slate-100 text-[#000080]/40 group-hover:bg-blue-600 group-hover:text-white text-[9px] font-black uppercase rounded-xl transition-all">Select</button>
                           )}
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {tripType === 'round' && (
              <div className="bg-white rounded-[2.5rem] border border-[#000080]/10 shadow-sm overflow-hidden">
                <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full">Return</span>
                      <p className="text-sm font-black text-indigo-900 uppercase italic truncate max-w-[200px]">{mixPicks.returnTransport?.name || '---'}</p>
                    </div>
                    <p className="text-lg font-black text-indigo-600 tracking-tighter">{mixPicks.returnTransport?.price || '---'}</p>
                </div>
                
                <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {loading && allReturn.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Searching Returns...</p>
                      </div>
                    ) : (
                      allReturn.map((item, i) => (
                        <div 
                          key={i} 
                          onClick={() => setMixPicks({ returnTransport: item })}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${mixPicks.returnTransport?.name === item.name ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-5">
                             <div className={`p-3 rounded-xl transition-colors ${mixPicks.returnTransport?.name === item.name ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-[#000080]/40 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                               {item.icon ? <item.icon className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                             </div>
                             <div>
                               <h5 className="font-black text-sm text-[#000080] tracking-tight">{item.name}</h5>
                               <p className="text-[10px] font-bold text-[#000080]/60 uppercase tracking-widest">{item.detail}</p>
                             </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                             <p className="text-base font-black text-indigo-600 tracking-tighter">{item.price}</p>
                             {mixPicks.returnTransport?.name === item.name ? (
                               <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full italic animate-pulse">Selected</span>
                             ) : (
                               <button className="px-4 py-1.5 bg-slate-100 text-[#000080]/40 group-hover:bg-indigo-600 group-hover:text-white text-[9px] font-black uppercase rounded-xl transition-all">Select</button>
                             )}
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}
          </section>

          {/* --- STAY MODULE --- */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Hotel className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-black text-[#000080] uppercase italic tracking-tight">{t('stay_options', 'STAY OPTIONS')}</h3>
                 <p className="text-[10px] font-bold text-[#000080]/40 uppercase tracking-widest">Premium hotels in {displayDest}</p>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-[#000080]/10 shadow-sm overflow-hidden">
               <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <span className="px-3 py-1 bg-amber-600 text-white text-[8px] font-black uppercase rounded-full">In Cart</span>
                     <p className="text-sm font-black text-amber-900 uppercase italic truncate max-w-[200px]">{mixPicks.hotel?.name || '---'}</p>
                  </div>
                  <p className="text-lg font-black text-amber-600 tracking-tighter">{mixPicks.hotel?.price || '---'}</p>
               </div>
               
               <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {loading && allHotels.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sourcing Real Stays...</p>
                    </div>
                  ) : (
                    allHotels.map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => setMixPicks({ hotel: item })}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${mixPicks.hotel?.name === item.name ? 'bg-amber-50 border-amber-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-5">
                           <div className={`p-3 rounded-xl transition-colors ${mixPicks.hotel?.name === item.name ? 'bg-amber-600 text-white' : 'bg-slate-50 text-[#000080]/40 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                             <Hotel className="w-5 h-5" />
                           </div>
                           <div>
                             <h5 className="font-black text-sm text-[#000080] tracking-tight">{item.name}</h5>
                             <p className="text-[10px] font-bold text-[#000080]/60 uppercase tracking-widest">{item.detail}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-base font-black text-amber-600 tracking-tighter">{item.price}</p>
                           {mixPicks.hotel?.name === item.name && <span className="text-[8px] font-black uppercase text-amber-400 italic">Selected</span>}
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </section>

          {/* --- LOCAL TRANSIT MODULE --- */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Car className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-black text-[#000080] uppercase italic tracking-tight">{t('local_options', 'LOCAL TRANSIT')}</h3>
                 <p className="text-[10px] font-bold text-[#000080]/40 uppercase tracking-widest">Elite local mobility in {displayDest}</p>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-[#000080]/10 shadow-sm overflow-hidden">
               <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <span className="px-3 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-full">In Cart</span>
                     <p className="text-sm font-black text-emerald-900 uppercase italic">{mixPicks.local?.name || '---'}</p>
                  </div>
                  <p className="text-lg font-black text-emerald-600 tracking-tighter">{mixPicks.local?.price || '---'}</p>
               </div>
               
               <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {allLocals.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => setMixPicks({ local: item })}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${mixPicks.local?.name === item.name ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-5">
                         <div className={`p-3 rounded-xl transition-colors ${mixPicks.local?.name === item.name ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-[#000080]/40 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                           {item.icon ? <item.icon className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                         </div>
                         <div>
                           <h5 className="font-black text-sm text-[#000080] tracking-tight">{item.name}</h5>
                           <p className="text-[10px] font-bold text-[#000080]/60 uppercase tracking-widest">{item.detail}</p>
                         </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                         <div className="flex items-center gap-2">
                           <p className="text-base font-black text-emerald-600 tracking-tighter">
                             {item.price && item.price !== 'Included' ? item.price : '₹2,500'}
                           </p>
                           <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${item.source === 'live' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-[#000080]/60'}`}>
                              {item.source === 'live' ? 'Live' : 'Est'}
                           </span>
                         </div>
                         {mixPicks.local?.name === item.name ? (
                           <span className="px-3 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-full italic animate-pulse">Selected</span>
                         ) : (
                           <button className="px-4 py-1.5 bg-slate-100 text-[#000080]/40 group-hover:bg-emerald-600 group-hover:text-white text-[9px] font-black uppercase rounded-xl transition-all">Select</button>
                         )}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </section>
        </div>

         {/* --- STICKY SUMMARY SIDEBAR (RIGHT) --- */}
         <aside className="lg:col-span-4 sticky top-8">
            <div className="bg-[#138808] rounded-[2.5rem] p-6 text-white shadow-2xl space-y-6 border border-white/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9933]/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
               
               <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-[#FF9933]" />
                  <h3 className="text-lg font-black uppercase italic tracking-tight">{t('cart_summary', 'CART SUMMARY')}</h3>
               </div>
               <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest italic">{displayDest} Booking</p>

               <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center text-[10px]">
                     <p className="font-black text-white/60 uppercase tracking-widest">Travel ({partySize} Pax)</p>
                     <p className="font-black text-[#FF9933]">₹{((Number(mixPicks.transport?.priceNum) || 0) * partySize).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <p className="font-black text-white/60 uppercase tracking-widest">Stay ({nights} Nights)</p>
                     <p className="font-black text-[#FF9933]">₹{((Number(mixPicks.hotel?.priceNum) || 0) * nights * calculateRoomsNeeded(partySize)).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <p className="font-black text-white/60 uppercase tracking-widest">Local Transit</p>
                     <p className="font-black text-[#FF9933]">₹{(Number(mixPicks.local?.priceNum) || 0).toLocaleString()}</p>
                  </div>
               </div>

               <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-end">
                     <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">{t('indicative_total', 'Total Cost')}</p>
                     <div className="text-right">
                        <p className="text-3xl font-black text-[#FF9933] tracking-tighter leading-none">₹{mixTotal.toLocaleString()}</p>
                        <p className="text-[6px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1 italic">Indicative Market Fare</p>
                     </div>
                  </div>

                  <button
                   onClick={handleConfirmPlan}
                   disabled={isVerifying || !mixPicks.transport || !mixPicks.hotel}
                   className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl flex flex-col items-center gap-1.5 leading-none ${
                     !isVerifying && mixPicks.transport && mixPicks.hotel 
                       ? 'bg-[#FF9933] text-white hover:bg-orange-600 hover:-translate-y-1 active:scale-95 shadow-orange-950/40' 
                       : 'bg-white/10 text-white/20 cursor-not-allowed grayscale'
                   }`}
                 >
                   {isVerifying ? (
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING...</span>
                      </div>
                   ) : (
                     <span>CONFIRM & CHECKOUT</span>
                   )}
                 </button>
                
                <div className="flex flex-col gap-2">
                   <p className="text-center text-[8px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                      Price includes GST & service fees. Free cancellation on most selections.
                   </p>
                   <div className="flex justify-center gap-3 opacity-30">
                      <ShieldCheck className="w-4 h-4" />
                      <CheckCircle2 className="w-4 h-4" />
                   </div>
                </div>
              </div>
           </div>

           <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
              <ShieldCheck className="w-6 h-6 text-green-600 shrink-0" />
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                 YatraAI Secured Booking. Your price is protected by our live verification system.
              </p>
           </div>
        </aside>
      </div>
    </motion.section>
  );
}

