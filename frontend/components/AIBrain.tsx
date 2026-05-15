'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, MessageSquare, Compass, ShieldCheck, Zap, Send,
  Mic, MicOff, RotateCcw, ChevronDown, Train, Plane, MapPin,
  Thermometer, Wallet, Info, BrainCircuit, PartyPopper, Utensils,
  Beer, ShoppingBag, Castle, Waves, Moon, Camera, Image as ImageIcon,
  Paperclip, Plus, Globe, Volume2, VolumeX, PanelRight, Maximize,
  Calendar, Navigation, CheckCircle2, Hotel, Car, Phone, Ship, Check
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Web Speech API Types ──────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

// ── Types ────────────────────────────────────────────────────────────────────
export interface QuickReply {
  label: string;
  value: string;
  field: 'origin' | 'destination' | 'startDate' | 'endDate' | 'budget' | 'adults';
  icon?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  timestamp?: number;
  quickReplies?: QuickReply[];
}

export interface InputUpdate {
  field: string;
  value: string | number;
}
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useAIBrainStore, useTripStore, useTripPlannerStore, useTourGuideStore, WizardField } from '@/lib/store';
import { WeatherService } from '@/lib/services/travel/weather';
import { isoToDdMonthYy } from '@/lib/dateFormat';
import { supabase } from '@/lib/supabase/client';
import { generateIndianVoice, speakWithBrowserTTS } from '@/lib/bhashini';

/** Use MediaRecorder + `/api/voice/transcribe` only — never Chrome Web Speech. */
const VOICE_FORCE_SERVER_STT = process.env.NEXT_PUBLIC_VOICE_SERVER_STT === 'true';
/** Chrome Web Speech only — no server STT fallback when Google speech returns `network`. */
const VOICE_CHROME_SPEECH_ONLY = process.env.NEXT_PUBLIC_VOICE_CHROME_SPEECH_ONLY === 'true';

// ── Typing cursor blink ───────────────────────────────────────────────────────
const Cursor = () => (
  <span className="inline-block w-[2px] h-[1em] bg-[#FF9933] ml-0.5 align-middle animate-cursor-blink" />
);

// ── Quick Reply Chips ────────────────────────────────────────────────────────
const QuickReplyChips = memo(function QuickReplyChips({ chips, onSelect, disabled }: {
  chips: QuickReply[];
  onSelect: (chip: QuickReply) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const fieldIcons: Record<string, any> = {
    origin: Navigation,
    destination: MapPin,
    startDate: Calendar,
    endDate: Calendar,
    budget: Wallet,
    adults: Sparkles,
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((chip) => {
        const Icon = fieldIcons[chip.field] || Sparkles;
        const isSelected = selected === chip.value;
        return (
          <motion.button
            key={chip.value}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            disabled={disabled || isSelected}
            onClick={() => {
              setSelected(chip.value);
              onSelect(chip);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
              ${ isSelected
                ? 'bg-saffron border-saffron text-white shadow-lg shadow-saffron/30'
                : 'bg-orange-50/50 border-orange-100 text-saffron hover:bg-saffron/15 hover:border-saffron/50'
              }`}
          >
            {isSelected ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
            {chip.label}
          </motion.button>
        );
      })}
    </div>
  );
});

// ── Discovery Card (for AI-grounded suggestions not in searchData) ────────
const DiscoveryCard = memo(function DiscoveryCard({ data }: { data: Record<string, string> }) {
  const type = data.type?.toLowerCase() || 'stay';
  
  const Icon = type === 'air' || type === 'flight' ? Plane : 
               type === 'rail' || type === 'train' ? Train : 
               type === 'stay' || type === 'hotel' ? Hotel : Car;

  const title = data.destination || data.title || data.name || 'Elite Suggestion';
  const budget = data.budget || data.price || 'Syncing...';
  const duration = data.duration || 'Syncing...';

  // Dynamic image based on title/type
  const query = encodeURIComponent(`${title} india travel`.replace(/\s+/g, ','));
  const fallbackUrl = `https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=600`; // Taj Mahal

  return (
    <div className="bg-white rounded-[2rem] p-0 overflow-hidden shadow-2xl border border-slate-50 hover:border-[#FF9933]/20 transition-all group mt-4">
      <div className="relative h-32 overflow-hidden">
        <img 
          src={`https://loremflickr.com/600/400/${query}`} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackUrl;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
      </div>
      
      <div className="p-5 pt-1 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF9933]/5 flex items-center justify-center border border-[#FF9933]/10">
            <Icon className="w-5 h-5 text-[#FF9933]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Elite Discovery</p>
            <h4 className="text-lg font-black text-[#000080] uppercase tracking-tighter leading-none">{title}</h4>
          </div>
        </div>
        
        <div className="flex items-center gap-4 py-3 border-y border-slate-100">
          <div className="flex-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Total</p>
             <p className="text-base font-black text-[#138808] uppercase tracking-tighter">{budget}</p>
          </div>
          <div className="w-px h-6 bg-slate-100" />
          <div className="flex-1 text-right">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Route / Status</p>
             <p className="text-base font-black text-[#000080] uppercase tracking-tighter truncate">{duration}</p>
          </div>
        </div>
      </div>
    </div>
  );
});



// ── Selection Card (for e-cart options in chat) ───────────────────────────


const AIBrainSelectionCard = memo(function AIBrainSelectionCard({ type, index }: { type: string; index: number }) {
  const { searchData, setMixPicks, mixPicks } = useTripPlannerStore();
  
  const Icon = type === 'air' || type === 'flight' ? Plane : 
               type === 'rail' || type === 'train' ? Train : 
               type === 'stay' || type === 'hotel' ? Hotel : Car;

  const data = (type === 'air' || type === 'flight') ? searchData?.flights?.[index] :
               (type === 'rail' || type === 'train') ? searchData?.trains?.[index] :
               (type === 'stay' || type === 'hotel') ? searchData?.hotels?.[index] :
               searchData?.taxis?.[index];

  if (!data) return null;

  // Logic: Hide if already selected for this category
  const isSelected = (type === 'stay' || type === 'hotel') ? mixPicks.hotel : mixPicks.transport;
  if (isSelected && (isSelected.name === data.name || isSelected.operator === data.operator)) return null;

  const name = data.name || data.operator || data.airline || 'Suggested Option';
  const price = data.price ? (data.price.startsWith('₹') ? data.price : `₹${data.price}`) : 'Syncing...';
  const detail = data.features || data.detail || data.arrival ? `${data.departure} → ${data.arrival}` : 'Elite Choice';
  const isUnavailable = data.disabled || data.status === 'unavailable';

  return (
    <div className={`bg-white rounded-[2rem] p-6 space-y-4 shadow-xl border border-slate-50 hover:border-[#FF9933]/20 transition-all group mt-4 ${isUnavailable ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF9933]/5 flex items-center justify-center border border-[#FF9933]/10">
            <Icon className="w-6 h-6 text-[#FF9933]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{isUnavailable ? 'Sold Out' : `Elite ${type}`}</p>
            <h4 className="text-xl font-black text-[#000080] uppercase tracking-tighter leading-none truncate max-w-[180px]">{name}</h4>
          </div>
        </div>
        {!isUnavailable && (
          <div className="text-right">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Investment</p>
             <p className="text-xl font-black text-[#138808] uppercase tracking-tighter">{price}</p>
          </div>
        )}
      </div>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight line-clamp-1 border-t border-slate-50 pt-4">
        {detail}
      </p>
      {!isUnavailable && (
        <button
          onClick={() => {
             const tierItem = {
               label: type.charAt(0).toUpperCase() + type.slice(1),
               name,
               detail,
               price,
               priceNum: parseInt(price.replace(/[₹,]/g, '')) || 0,
               icon: Icon,
               raw: data
             };
             const pick: any = {};
             if (type === 'air' || type === 'flight' || type === 'rail' || type === 'train') pick.transport = tierItem;
             else if (type === 'stay' || type === 'hotel') pick.hotel = tierItem;
             else pick.local = tierItem; 
             
             setMixPicks(pick);
             toast.success(`Selected ${name}`);
          }}
          className="w-full py-4 bg-[#FF9933] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95"
        >
          Select & Proceed
        </button>
      )}
    </div>
  );
});

// ── Single chat message bubble ────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({
  msg,
  onQuickReply,
  isStreaming,
}: {
  msg: AIMessage;
  onQuickReply?: (chip: QuickReply) => void;
  isStreaming?: boolean;
}) {
  const isUser = msg.role === 'user';
  const [isExpanded, setIsExpanded] = useState(false);
  
  const charLimit = 350;
  const isLong = !isUser && !msg.isStreaming && msg.content.length > charLimit;
  
  const displayContent = isLong && !isExpanded 
    ? msg.content.slice(0, charLimit) + '...'
    : msg.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-1 shadow-md border border-saffron/30 bg-white">
          <img src="/yatra-guide.png" alt="Yatra AI" className="w-full h-full object-cover object-center" />
        </div>
      )}
      <div className={`max-w-[86%] ${ !isUser ? 'w-full' : '' }`}>
        <div
          className={`px-5 py-4 rounded-3xl text-sm leading-relaxed font-bold shadow-sm
            ${isUser
              ? 'bg-[#FF9933] text-white rounded-tr-sm shadow-orange-200'
              : 'bg-white border border-slate-100 text-[#000080] rounded-tl-sm'
            }`}
        >
          {/* Render content using ReactMarkdown, but hide [SELECT:...] and [UPDATE:...] tags from the UI */}
          <div className="markdown-content prose prose-sm max-w-none prose-slate">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({children}) => <strong className="font-black text-[#FF9933]">{children}</strong>,
                ul: ({children}) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                li: ({children}) => <li className="text-[11px] leading-snug">{children}</li>,
                h1: ({children}) => <h1 className="text-sm font-black uppercase tracking-tight text-[#FF9933] mb-1">{children}</h1>,
                h2: ({children}) => <h2 className="text-xs font-black uppercase tracking-tight text-[#FF9933] mb-1">{children}</h2>,
                h3: ({children}) => <h3 className="text-xs font-black uppercase tracking-tight text-[#FF9933] mb-1">{children}</h3>,
              }}
            >
              {displayContent
                .replace(/\[UPDATE:.*?\]/g, '')
                .replace(/\[SELECT:.*?\]/g, '')
                .replace(/\[DISCOVERY:.*?\]/g, '')
                .replace(/\\n/g, '\n') // Fix literal \n if present
              }
            </ReactMarkdown>
          </div>

          {msg.isStreaming && <Cursor />}
          {isLong && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="block mt-2 text-[10px] text-[#FF9933] font-bold uppercase tracking-widest hover:text-[#FF9933] transition-colors"
            >
              {isExpanded ? 'Show Less' : 'Read More'}
            </button>
          )}

          {/* Render Discovery Cards */}
          {!isUser && !msg.isStreaming && (() => {
            const discoveryMatches = [...msg.content.matchAll(/\[DISCOVERY:\s*(.*?)\]/g)];
            if (discoveryMatches.length === 0) return null;
            
            const { budget: userBudget, party_size, departure_date, return_date } = useTourGuideStore.getState();
            const maxBudget = Number(userBudget) || 0;
            const party = (party_size?.adults || 1) + (party_size?.kids || 0);
            
            // Calculate nights
            let nights = 1;
            if (departure_date && return_date) {
              const start = new Date(departure_date);
              const end = new Date(return_date);
              nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            }

            return (
              <div className="space-y-3 mt-2">
                {discoveryMatches.map((m, idx) => {
                  const params: Record<string, string> = {};
                  m[1].split(/\s+/).forEach(pair => {
                    const [k, v] = pair.split('=');
                    if (k && v) params[k] = v.replace(/_/g, ' ');
                  });
                  
                  // Extraction and dynamic calculation if AI fails to give total
                  const rawPriceStr = params.budget || params.price || '0';
                  let priceNum = parseInt(rawPriceStr.replace(/[₹,]/g, ''), 10) || 0;
                  
                  // Heuristic: If price is too low for a total (e.g. < 5000 for a stay), 
                  // it might be per-person or per-night.
                  const type = params.type?.toLowerCase() || 'stay';
                  const isPerPerson = rawPriceStr.toLowerCase().includes('/p') || rawPriceStr.toLowerCase().includes('person');
                  const isPerNight = rawPriceStr.toLowerCase().includes('/n') || rawPriceStr.toLowerCase().includes('night');

                  if (isPerPerson) priceNum *= party;
                  if (isPerNight) priceNum *= nights;
                  
                  // Strict budget check: MUST be <= budget
                  if (maxBudget > 0 && priceNum > maxBudget) {
                    console.log(`[Discovery] Filtered out ${params.name}: ₹${priceNum} exceeds ₹${maxBudget}`);
                    return null;
                  }
                  
                  return <DiscoveryCard key={`discovery-${idx}`} data={{ ...params, budget: `₹${priceNum.toLocaleString()}` }} />;
                })}
              </div>
            );
          })()}

          {/* Render Selection Cards if tags are found */}
          {!isUser && !msg.isStreaming && (() => {
            const selectMatches = [...msg.content.matchAll(/\[SELECT:\s*(.*?)=(.*?)\]/g)];
            if (selectMatches.length === 0) return null;
            return (
              <div className="space-y-2 mt-2">
                {selectMatches.map((m, idx) => (
                  <AIBrainSelectionCard key={idx} type={m[1].trim()} index={parseInt(m[2].trim())} />
                ))}
              </div>
            );
          })()}
        </div>
        {/* Quick Reply Chips */}
        {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && onQuickReply && (
          <QuickReplyChips
            chips={msg.quickReplies}
            onSelect={onQuickReply}
            disabled={isStreaming}
          />
        )}
      </div>
    </motion.div>
  );
});

const HomeView = memo(({ sendMessage, activeItinerary, tiers, context, language, setUseVoiceMode, handleVoiceInput, plannerStage, searchData, mixPicks, tourGuide }: any) => {
  const hasData = searchData && (searchData.trains?.length > 0 || searchData.flights?.length > 0 || searchData.hotels?.length > 0 || searchData.ferries?.length > 0);
  const { setPlannerStage, setMixPicks } = useTripPlannerStore();

  const toPriceNum = (price: string | undefined) => parseInt(String(price || '').replace(/[₹,]/g, '')) || 0;
  const indicativeRupeeNum = (price: string | undefined) => {
    const m = String(price || '').match(/₹?\s*([\d,]+)/);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10) || 0;
    return toPriceNum(price);
  };
  const flightOptions = (searchData?.flights || []).slice(0, 6);
  const trainOptions = (searchData?.trains || []).slice(0, 6);
  const ferryOptions = (searchData?.ferries || []).slice(0, 6);
  const hotelOptions = (searchData?.hotels || []).slice(0, 12);
  const mobilityOptions = (searchData?.taxis || []).slice(0, 6);
  
  return (
  <div className="space-y-4 pt-2">
    {plannerStage === 'booking' && (
      <div className="hidden">
        {/* Telegram prompt removed per user request for zero distractions in-between */}
      </div>
    )}

    {plannerStage === 'selection' && (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-saffron to-orange-600 flex items-center justify-center shadow-lg shadow-saffron/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-micro font-black text-saffron uppercase tracking-widest">Master Control</p>
              <p className="text-[10px] text-[#000080] font-bold tracking-tight">Modify & Re-Craft</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed text-left italic">
            "Want to increase or decrease your travel budget? Just tell me, and I'll re-optimize your entire plan."
          </p>
          <div className="grid grid-cols-2 gap-2">
             <button onClick={() => sendMessage("I want to increase my budget. Show me more high-value options.")} className="py-2 bg-white border border-orange-100 rounded-xl text-[8px] font-black text-saffron uppercase tracking-widest hover:bg-orange-50">Increase Budget</button>
             <button onClick={() => sendMessage("I want to reduce my budget. Show me more economical choices.")} className="py-2 bg-white border border-orange-100 rounded-xl text-[8px] font-black text-saffron uppercase tracking-widest hover:bg-orange-50">Reduce Budget</button>
          </div>
        </div>

        <button 
          onClick={() => {
            const el = document.getElementById('marketplace-top');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            sendMessage("I'm looking at the marketplace options now. Help me choose the best ones.");
          }}
          className="w-full py-4 bg-gradient-to-r from-saffron to-orange-600 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-saffron/20 group transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
             <CheckCircle2 className="w-4 h-4 text-[#000080]" />
          </div>
          <div className="text-left">
             <p className="text-[10px] font-black text-[#000080] uppercase tracking-widest leading-none">Select/Choose</p>
             <p className="text-[11px] font-bold text-slate-600 italic">Best Options Available →</p>
          </div>
        </button>

        {mixPicks && (mixPicks.transport || mixPicks.hotel || mixPicks.local) && (
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 space-y-4 shadow-inner">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Odyssey Cart Status</p>
             <div className="space-y-3">
                {mixPicks.transport && (
                  <div className="flex items-center justify-between group/pick bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                        <Plane className="w-4 h-4 text-saffron" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-[#000080] uppercase leading-none truncate max-w-[120px]">{mixPicks.transport.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1">{mixPicks.transport.price}</p>
                      </div>
                    </div>
                    <button onClick={() => { setMixPicks({ transport: null }); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all text-slate-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {mixPicks.hotel && (
                  <div className="flex items-center justify-between group/pick bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                        <Hotel className="w-4 h-4 text-[#138808]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-[#000080] uppercase leading-none truncate max-w-[120px]">{mixPicks.hotel.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1">{mixPicks.hotel.price}/night</p>
                      </div>
                    </div>
                    <button onClick={() => { setMixPicks({ hotel: null }); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all text-slate-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {mixPicks.local && (
                  <div className="flex items-center justify-between group/pick bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                        <Car className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-[#000080] uppercase leading-none truncate max-w-[120px]">{mixPicks.local.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1">{mixPicks.local.price}</p>
                      </div>
                    </div>
                    <button onClick={() => { setMixPicks({ local: null }); }} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all text-slate-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
             </div>
             <div className="pt-3 border-t border-slate-200">
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                 AI Agent: "Your selections are optimized for the {activeItinerary?.tierLabel || 'current'} plan."
               </p>
             </div>
          </div>
        )}

        {/* AI-side quick selectors synced with Planner via shared store */}
        {(flightOptions.length > 0 || trainOptions.length > 0 || ferryOptions.length > 0 || hotelOptions.length > 0 || mobilityOptions.length > 0) && (
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-4 shadow-xl">
            <p className="text-[9px] font-black text-[#FF9933] uppercase tracking-[0.2em]">AI Quick Selectors</p>

            {flightOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Flight (Radio Select)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {flightOptions.map((f: any, idx: number) => {
                    const name = `${f.airline || 'Flight'} ${f.flight || ''}`.trim();
                    const detail = `${f.departure || ''} → ${f.arrival || ''}${f.duration ? ` · ${f.duration}` : ''}`;
                    const selected = (mixPicks?.transport?.name === name) && (mixPicks?.transport?.label === 'Flight');
                    return (
                      <label key={`ai-flight-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'border-[#FF9933]/40 bg-[#FF9933]/10' : 'border-slate-200 bg-white/80'}`}>
                        <input
                          type="radio"
                          name="ai-flight-select"
                          checked={selected}
                          onChange={() =>
                            setMixPicks({
                              transport: {
                                label: 'Flight',
                                name,
                                detail,
                                price: f.price || '₹0',
                                priceNum: toPriceNum(f.price),
                                icon: Plane,
                                raw: f,
                                source: f.source
                              },
                            })
                          }
                          className="accent-[#FF9933]"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#000080] uppercase truncate">{name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{detail}</p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-[#FF9933]">{f.price || '—'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {hotelOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hotel (Radio Select)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {hotelOptions.map((h: any, idx: number) => {
                    const name = h.name || 'Hotel';
                    const detail = `${h.area || ''}${h.stars ? ` · ${'★'.repeat(h.stars)}` : ''}`.trim();
                    const selected = mixPicks?.hotel?.name === name;
                    return (
                      <label key={`ai-hotel-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'border-green/40 bg-green/10' : 'border-slate-200 bg-white/80'}`}>
                        <input
                          type="radio"
                          name="ai-hotel-select"
                          checked={selected}
                          onChange={() =>
                            setMixPicks({
                              hotel: {
                                label: 'Hotel',
                                name,
                                detail,
                                price: h.price || '₹0',
                                priceNum: toPriceNum(h.price),
                                icon: Hotel,
                                raw: h,
                                source: h.source
                              },
                            })
                          }
                          className="accent-green"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#000080] uppercase truncate">{name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{detail || 'Recommended stay'}</p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-blue-700">{String(h.price || '').replace(/\(|\)/g, '') || '—'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {trainOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Train (Radio Select)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {trainOptions.map((t: any, idx: number) => {
                    const name = t.name || 'Train';
                    const detail = `${t.departure || ''} → ${t.arrival || ''}${t.duration ? ` · ${t.duration}` : ''}`;
                    const selected = (mixPicks?.transport?.name === name) && (mixPicks?.transport?.label === 'Train');
                    return (
                      <label key={`ai-train-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'border-[#FF9933]/40 bg-[#FF9933]/10' : 'border-slate-200 bg-white/80'}`}>
                        <input
                          type="radio"
                          name="ai-train-select"
                          checked={selected}
                          onChange={() =>
                            setMixPicks({
                              transport: {
                                label: 'Train',
                                name,
                                detail,
                                price: t.price || '₹0',
                                priceNum: toPriceNum(t.price),
                                icon: Train,
                                raw: t,
                                source: t.source
                              },
                            })
                          }
                          className="accent-[#FF9933]"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#000080] uppercase truncate">{name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{detail}</p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-[#FF9933]">{String(t.price || '').replace(/\(|\)/g, '') || '—'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {ferryOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ferry / Ro‑Ro (Radio Select)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {ferryOptions.map((f: any, idx: number) => {
                    const name = f.name || 'Ferry';
                    const detail = [f.departure, f.arrival].filter(Boolean).join(' → ') + (f.duration ? ` · ${f.duration}` : '');
                    const selected = (mixPicks?.transport?.name === name) && (mixPicks?.transport?.label === 'Ferry');
                    return (
                      <label key={`ai-ferry-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'border-green/40 bg-green/10' : 'border-slate-200 bg-white/80'}`}>
                        <input
                          type="radio"
                          name="ai-ferry-select"
                          checked={selected}
                          onChange={() =>
                            setMixPicks({
                              transport: {
                                label: 'Ferry',
                                name,
                                detail,
                                price: f.price || 'Check operator',
                                priceNum: indicativeRupeeNum(f.price),
                                icon: Ship,
                                raw: f,
                                source: f.source
                              },
                            })
                          }
                          className="accent-green"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#000080] uppercase truncate">{name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{detail || 'Sea crossing'}</p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-blue-700">{String(f.price || '').replace(/\(|\)/g, '') || '—'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {mobilityOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mobility (Radio Select)</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {mobilityOptions.map((m: any, idx: number) => {
                    const name = m.type || m.name || 'Taxi';
                    const detail = `${m.eta || ''}${m.estimatedKm ? ` · ${m.estimatedKm}` : ''}`.trim() || 'Ground mobility';
                    const selected = mixPicks?.local?.name === name;
                    return (
                      <label key={`ai-mobility-${idx}`} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selected ? 'border-saffron/40 bg-saffron/10' : 'border-slate-200 bg-white/80'}`}>
                        <input
                          type="radio"
                          name="ai-mobility-select"
                          checked={selected}
                          onChange={() =>
                            setMixPicks({
                              local: {
                                label: 'Taxi',
                                name,
                                detail,
                                price: m.price || '₹0',
                                priceNum: toPriceNum(m.price),
                                icon: Car,
                                raw: m,
                                source: m.source
                              },
                            })
                          }
                          className="accent-saffron"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-[#000080] uppercase truncate">{name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{detail}</p>
                        </div>
                        <span className="ml-auto text-[9px] font-black text-blue-700">{String(m.price || '').replace(/\(|\)/g, '') || '—'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {hasData && !activeItinerary && (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-green" />
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Grounded Data Live</span>
        </div>
        <div className="flex gap-1.5">
          {searchData.flights?.length > 0 && <Plane className="w-2.5 h-2.5 text-slate-300" />}
          {searchData.trains?.length > 0 && <Train className="w-2.5 h-2.5 text-slate-300" />}
          {searchData.ferries?.length > 0 && <Ship className="w-2.5 h-2.5 text-slate-300" />}
          {searchData.hotels?.length > 0 && <Hotel className="w-2.5 h-2.5 text-slate-300" />}
        </div>
      </div>
    )}

    {(activeItinerary || (tiers && tiers.length > 0)) && (
      <div className="bg-[#FF9933]/5 border border-[#FF9933]/15 rounded-2xl p-4 space-y-2 text-left">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" />
          <span className="text-[9px] font-black text-[#FF9933] uppercase tracking-widest">
            {activeItinerary ? `${activeItinerary.tierLabel} Plan Active` : 'Trip Plans Ready'}
          </span>
        </div>
        {activeItinerary ? (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-slate-700 font-bold">{activeItinerary.from || 'Trip'} → {activeItinerary.to || 'Destination'} · {activeItinerary.nights || 0}N</p>
              <p className="text-[9px] text-slate-400 mt-1 line-clamp-2">Transport: <span className="text-slate-500">{activeItinerary.transport?.name || 'Not selected'}</span></p>
              <p className="text-[9px] text-slate-400 line-clamp-2">Hotel: <span className="text-slate-500">{activeItinerary.hotel?.name || 'Not selected'}</span></p>
              <p className="text-[9px] text-slate-400 line-clamp-2">Activities: <span className="text-slate-500">{activeItinerary.local?.name || 'Exploring local'}</span></p>
              <p className="text-sm font-black text-[#FF9933] mt-2">{activeItinerary.total}</p>
            </div>
            
            <div className="border-t border-[#FF9933]/20 pt-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Explore Alternatives</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => sendMessage(`Show me alternative Flight options for my trip from ${activeItinerary.from || 'current location'} to ${activeItinerary.to || 'my destination'}`)}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-50 border border-slate-200 rounded-lg hover:border-[#FF9933]/50 hover:bg-[#FF9933]/10 transition-all"
                >
                  <Plane className="w-4 h-4 text-[#FF9933]" />
                  <span className="text-[8px] font-bold text-slate-500">Flights</span>
                </button>
                <button 
                  onClick={() => sendMessage(`Show me alternative Train options for my trip from ${activeItinerary.from || 'current location'} to ${activeItinerary.to || 'my destination'}`)}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-50 border border-slate-200 rounded-lg hover:border-[#FF9933]/50 hover:bg-[#FF9933]/10 transition-all"
                >
                  <Train className="w-4 h-4 text-[#FF9933]" />
                  <span className="text-[8px] font-bold text-slate-500">Trains</span>
                </button>
                <button 
                  onClick={() => sendMessage(`Show me alternative Hotel options in ${activeItinerary.to || 'my destination'}`)}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-slate-50 border border-slate-200 rounded-lg hover:border-[#FF9933]/50 hover:bg-[#FF9933]/10 transition-all"
                >
                  <Moon className="w-4 h-4 text-[#FF9933]" />
                  <span className="text-[8px] font-bold text-slate-500">Hotels</span>
                </button>
              </div>
            </div>
            
            <button onClick={() => { sendMessage(`Tell me more about my ${activeItinerary.tierLabel} trip plan from ${activeItinerary.from} to ${activeItinerary.to} costing ${activeItinerary.total}`); }}
              className="w-full py-2 bg-[#FF9933]/10 border border-[#FF9933]/20 text-[#FF9933] text-[10px] font-black rounded-xl hover:bg-[#FF9933]/20 transition-all">
              Ask AI to analyze this plan
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {tiers && tiers.slice(0, 3).map((t: any) => (
              <div key={t.label} className="flex justify-between text-[9px]">
                <span className="text-slate-400">{t.label}</span>
                <span className="font-bold text-slate-700">{t.total}</span>
              </div>
            ))}
            <button 
              onClick={() => {
                const budgetList = tiers?.map((t: any) => `${t.label}: ${t.total}`).join(', ') || 'available';
                sendMessage(`I'm planning a trip. My budget options are ${budgetList}. Which do you recommend?`);
              }}
              className="mt-1 w-full py-1.5 bg-[#FF9933]/10 border border-[#FF9933]/20 text-[#FF9933] text-[9px] font-black rounded-xl hover:bg-[#FF9933]/20 transition-all"
            >
              Get AI Recommendation &rarr;
            </button>
          </div>
        )}
      </div>
    )}

    <div className="bg-orange-500/5 border border-orange-500/15 rounded-2xl p-4 space-y-2 text-left">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#138808]" />
        <span className="text-[9px] font-bold text-[#138808] uppercase tracking-widest">Caring AI Agent</span>
      </div>
      <p className="text-[9px] text-slate-400 leading-relaxed">
        I monitor <strong className="text-slate-700">AQI, Weather</strong> and <strong className="text-slate-700">Safety</strong> trends for your trip. Your security and comfort are my top priority.
      </p>
    </div>

    <div className="bg-[#fdf8f3] border border-orange-200/50 rounded-2xl p-4 space-y-3 text-left shadow-lg shadow-orange-900/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center border border-sky-200">
            <Mic className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 tracking-tight">AI Voice Interaction</p>
            <p className="text-2xs text-slate-400 font-medium uppercase tracking-widest">Bhashini Multilingual</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => { setUseVoiceMode(true); }}
          className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center shadow-lg shadow-orange-400/30 relative group shrink-0"
        >
          <Mic className="w-5 h-5 text-[#000080] group-hover:scale-110 transition-transform" />
          <div className="absolute inset-0 rounded-full border-2 border-orange-400 opacity-20 animate-ping" />
        </motion.button>
      </div>
      <p className="text-xs text-slate-500 italic font-medium">
        "Ask me to find a cheaper option or book the Rajdhani..."
      </p>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <Globe className="w-3.5 h-3.5 text-emerald-400" />
        <p className="text-[9px] text-slate-400 leading-relaxed">
          Language: <span className="text-slate-800 font-bold">{language?.toUpperCase() || 'EN'}</span>. Responses and voice adapt to your selected language.
        </p>
      </div>
      </div>
      

    </div>
  );
});

const ChatView = memo(({
  dynamicPrompts, sendMessage, isStreaming, messages, isEmpty, scrollRef, setUseVoiceMode,
  useVoiceMode, handleVoiceInput, handleStop, inputValue, setInputValue, inputRef, fileInputRef,
  setSelectedImage, selectedImage, audioRef
}: any) => (
  <div className="flex flex-col h-full">
    <div className="shrink-0 px-4 py-3 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto scrollbar-hide">
      {dynamicPrompts.map(({ icon: Icon, label, prompt }: any) => (
        <button
          key={label}
          onClick={() => sendMessage(prompt)}
          disabled={isStreaming}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full whitespace-nowrap hover:border-[#FF9933]/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Icon className="w-3 h-3 text-[#138808]" />
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#000080]">{label}</span>
        </button>
      ))}
    </div>

    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
      {isEmpty ? (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
          <MessageSquare className="w-10 h-10 text-slate-300" />
          <p className="text-[10px] text-slate-400 font-bold">Start a conversation</p>
        </div>
      ) : (
        messages.map((msg: any, i: number) => <MessageBubble key={i} msg={msg} />)
      )}
    </div>

  </div>
));

// ── Main AIBrain ──────────────────────────────────────────────────────────────
export default function AIBrain({ context }: { context?: Record<string, unknown> }) {
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { 
    destination, startDate, endDate, origin, isOnboarded,
    userPersona: storePersona, likes: storeLikes, dislikes: storeDislikes,
    preferredVoice: storeVoice, setPreferredVoice
  } = useTripStore();
  const { activeItinerary, tiers, searchData, plannerStage, mixPicks, setPlannerStage, weather, activePNR } = useTripPlannerStore();
  // Tour Guide shared state — read-only here; written by planner page
  const tourGuide = useTourGuideStore();
  const {
    messages, isStreaming, isOpen, isPrimarySidebarOpen,
    addMessage, updateLastMessage, finalizeLastMessage,
    setStreaming, setOpen, togglePrimarySidebar, clearHistory,
    inputUpdateHandler, isWizardMode,
    pendingOutbound, setPendingOutbound,
    wizardStep, wizardData, setWizardStep, setWizardData, wizardSchema
  } = useAIBrainStore();

  // ── States ──────────────────────────────────────────────────────────────
  // ── Auto-fetch weather whenever destination changes ──
  useEffect(() => {
    if (!destination || destination.trim().length <= 2) return;
    const cleanDest = destination.split(',')[0].replace(/(North|South|East|West)\s+/i, '').trim();
    WeatherService.getCurrentWeather(cleanDest).then(data => {
      if (data) useTripPlannerStore.getState().setWeather(data);
    });
  }, [destination]); // re-fetch whenever destination changes


  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isServerVoiceRecording, setIsServerVoiceRecording] = useState(false);
  const [serverVoiceFallbackUi, setServerVoiceFallbackUi] = useState(false);
  const [useVoiceMode, setUseVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [audioFeedback, setAudioFeedback] = useState(false);
  const { setUserPersona, setLikes, setDislikes } = useTripStore();

  // ── Sync with Supabase Profile on Mount/User Change ──────────────────────
  useEffect(() => {
    async function syncProfile() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('yatra_profiles')
          .select('user_persona, likes, dislikes')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          if (data.user_persona) setUserPersona(data.user_persona);
          if (data.likes) setLikes(data.likes);
          if (data.dislikes) setDislikes(data.dislikes);
          if (data.preferred_voice) setPreferredVoice(data.preferred_voice as any);
        }
      } catch (err) {
        console.warn('[AIBrain] Profile sync failed:', err);
      }
    }
    syncProfile();
  }, [user?.id, setUserPersona, setLikes, setDislikes]);

  // ── Refs ────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  const syncedStages = [
    { id: 'inputs',      label: 'Details' },
    { id: 'suggestions', label: 'Options' },
    { id: 'results',     label: 'Itinerary' },
    { id: 'selection',   label: 'Selection Studio' },
    { id: 'booking',     label: 'Book' },
    { id: 'success',     label: 'Complete' }
  ];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechNetworkBlockedRef = useRef(false);
  const serverRecorderRef = useRef<MediaRecorder | null>(null);
  const serverChunksRef = useRef<BlobPart[]>([]);
  const serverStreamRef = useRef<MediaStream | null>(null);
  const isSendingRef = useRef(false);
  const useVoiceModeRef = useRef(useVoiceMode);
  const wizardStepRef = useRef(wizardStep);
  const wizardSchemaRef = useRef(wizardSchema);
  const wizardStartingRef = useRef(false);
  
  useEffect(() => { useVoiceModeRef.current = useVoiceMode; }, [useVoiceMode]);
  useEffect(() => { wizardStepRef.current = wizardStep; }, [wizardStep]);
  useEffect(() => { wizardSchemaRef.current = wizardSchema; }, [wizardSchema]);

  const speakResponseRef = useRef<any>(null);
  const sendMessageRef = useRef<any>(null);
  const handleVoiceInputRef = useRef<any>(null);
  const injectWizardQuestionRef = useRef<any>(null);
  const handleWizardAnswerRef = useRef<any>(null);
  const runServerVoiceToggleRef = useRef<any>(null);



  const persona = (() => {
    // Priority 1: User's selected archetype from Profile always wins
    if (storePersona && storePersona !== 'Lead Architect') return `${storePersona} 🚀`;
    
    // Priority 2: Dynamic vibe based on destination (only if no persona selected)
    const vibe = (destination || tourGuide.destination || '').toLowerCase();
    if (vibe.includes('goa') || vibe.includes('beach') || vibe.includes('bali')) return 'Sun-Kissed Guide 🏖️';
    if (vibe.includes('manali') || vibe.includes('mountain') || vibe.includes('switzerland')) return 'Alpine Explorer 🏔️';
    if (vibe.includes('paris') || vibe.includes('romantic') || vibe.includes('london')) return 'Sophisticated Local 🥂';
    if (vibe.includes('japan') || vibe.includes('kyoto') || vibe.includes('tokyo')) return 'Zen Navigator 🏮';
    
    return storePersona ? `${storePersona} 🚀` : 'Lead Architect 🚀';
  })();


  // Expose store to window for cross-component triggers (like 'Sync with AI' button)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).useAIBrainStore = useAIBrainStore;
    }
  }, []);




  // ── Generic: build QuickReply chips from a WizardField ────────────────────
  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setStreaming(false);
      isSendingRef.current = false;
    }
  }, [setStreaming]);

  // ── Server-side STT (Bhashini) — fallback when Web Speech API gets `network` ─
  const runServerVoiceToggle = useCallback(async () => {
    if (serverRecorderRef.current?.state === 'recording') {
      serverRecorderRef.current.stop();
      return;
    }

    serverStreamRef.current?.getTracks().forEach((t) => t.stop());
    serverStreamRef.current = null;
    serverChunksRef.current = [];
    serverRecorderRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      serverStreamRef.current = stream;
      serverChunksRef.current = [];

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = mimeCandidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      serverRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) serverChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsServerVoiceRecording(false);
        serverStreamRef.current?.getTracks().forEach((t) => t.stop());
        serverStreamRef.current = null;
        serverRecorderRef.current = null;

        const chunks = serverChunksRef.current;
        serverChunksRef.current = [];
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });

        if (blob.size < 800) {
          toast.error('Recording too short', { description: 'Speak a bit longer, then tap again to stop.' });
          return;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => {
            const dataUrl = String(r.result || '');
            const i = dataUrl.indexOf(',');
            resolve(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
          };
          r.onerror = () => reject(new Error('read failed'));
          r.readAsDataURL(blob);
        });

        const loading = toast.loading('Transcribing…');
        try {
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, language }),
          });
          const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
          toast.dismiss(loading);
          if (!res.ok) {
            toast.error('Transcription failed', {
              description: typeof data.error === 'string' ? data.error : res.statusText,
            });
            return;
          }
          const text = String(data.text || '').trim();
          if (text) sendMessageRef.current?.(text, true);
        } catch (e) {
          toast.dismiss(loading);
          toast.error('Transcription failed', {
            description: e instanceof Error ? e.message : 'Network error',
          });
        }
      };

      recorder.start(200);
      setIsServerVoiceRecording(true);
      toast.message('Recording…', {
        description: 'Tap the mic again when you finish speaking.',
        duration: 5000,
      });
    } catch (e) {
      serverStreamRef.current?.getTracks().forEach((t) => t.stop());
      serverStreamRef.current = null;
      serverRecorderRef.current = null;
      setIsServerVoiceRecording(false);
      toast.error('Could not access microphone', {
        description: e instanceof Error ? e.message : 'Permission denied or no mic.',
      });
    }
  }, [language]);

  useEffect(() => { runServerVoiceToggleRef.current = runServerVoiceToggle; }, [runServerVoiceToggle]);

  const handleVoiceInput = useCallback((action?: 'start' | 'stop') => {
    // ── BARGE-IN LOGIC (Interruptibility) ──
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
    handleStop(); // Interrupt any ongoing text generation

    if (VOICE_FORCE_SERVER_STT) {
      void runServerVoiceToggleRef.current?.();
      return;
    }
    if (!VOICE_CHROME_SPEECH_ONLY && speechNetworkBlockedRef.current) {
      void runServerVoiceToggleRef.current?.();
      return;
    }

    const Recognition =
      typeof window !== 'undefined'
        ? ((window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition)
        : undefined;

    if (!Recognition) {
      toast.error('Voice not supported in this browser', {
        description: 'Use Chrome, Edge, or Brave on desktop/Android. Firefox does not support Web Speech recognition.',
      });
      setUseVoiceMode(false);
      return;
    }

    if (!window.isSecureContext) {
      toast.error('Voice needs a secure connection', {
        description: 'Open the site via HTTPS or http://localhost — not a raw LAN IP over HTTP.',
      });
      setUseVoiceMode(false);
      return;
    }

    const currentlyListening = isListening || !!recognitionRef.current;
    const shouldStop = action === 'stop' || (action === undefined && currentlyListening);

    if (shouldStop) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
      return;
    }

    if (action === 'start' && currentlyListening) return;

    setIsListening(true);
    const recognition = new Recognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (final) {
        sendMessageRef.current?.(final, true);
        recognition.stop();
      } else {
        setInputValue(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setIsListening(false);
        recognitionRef.current = null;
        return;
      }
      console.error('Speech Error:', event.error);
      setIsListening(false);
      recognitionRef.current = null;

      if (event.error === 'network') {
        speechNetworkBlockedRef.current = true;
        setServerVoiceFallbackUi(true);
        void runServerVoiceToggleRef.current?.();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [language, isListening, handleStop, setUseVoiceMode, setInputValue, runServerVoiceToggle]);

  useEffect(() => { handleVoiceInputRef.current = handleVoiceInput; }, [handleVoiceInput]);

  const speakResponse = useCallback(async (text: string) => {
    setIsSpeaking(true);
    const onDone = () => {
      setIsSpeaking(false);
      if (useVoiceModeRef.current && useAIBrainStore.getState().isOpen && !speechNetworkBlockedRef.current) {
        setTimeout(() => handleVoiceInputRef.current?.('start'), 500);
      }
    };

    // ── Strip ALL markdown and technical tags before speaking ──
    const cleanText = text
      .replace(/\[UPDATE:[^\]]*\]/g, '')
      .replace(/\[SELECT:[^\]]*\]/g, '')
      .replace(/\[DISCOVERY:[^\]]*\]/g, '')
      .replace(/^#{1,6}\s+/gm, '')         // headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
      .replace(/\*([^*]+)\*/g, '$1')       // italic
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1') // underscore italic/bold
      .replace(/`{1,3}[^`]*`{1,3}/g, '')  // inline code / code blocks
      .replace(/^[-*+]\s+/gm, '')          // bullet points
      .replace(/^\d+\.\s+/gm, '')         // numbered lists
      .replace(/^[-]{3,}$/gm, '')          // horizontal rules
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links → keep text
      .replace(/[|\\]/g, '')               // table chars
      .replace(/\n{3,}/g, '\n\n')         // collapse excess newlines
      .replace(/\s{2,}/g, ' ')            // collapse excess spaces
      .trim();


    if (!cleanText) {
      onDone();
      return;
    }

    try {
      const audioBase64 = await generateIndianVoice(cleanText, language, storeVoice);
      if (audioBase64) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audioRef.current.onended = onDone;
        audioRef.current.onerror = () => {
          speakWithBrowserTTS(text, language).then(onDone).catch(onDone);
        };
        await audioRef.current.play();
      } else {
        await speakWithBrowserTTS(text, language);
        onDone();
      }
    } catch (err) {
      console.error('TTS Error:', err);
      try { await speakWithBrowserTTS(text, language); } catch { /* silent */ }
      onDone();
    }
  }, [language, storeVoice]);

  useEffect(() => { speakResponseRef.current = speakResponse; }, [speakResponse]);

  const buildChips = useCallback((field: any, collected: Record<string, any>): QuickReply[] => {
    const rawChips = typeof field.chips === 'function'
      ? field.chips(collected)
      : (field.chips ?? []);
    return rawChips.map((c: any) => ({
      label: c.label,
      value: c.value,
      field: field.id as QuickReply['field'],
    }));
  }, []);

  // ── Generic: inject question for a schema step ─────────────────────────────
  const injectWizardQuestion: (stepId: string, collected: Record<string, any>) => void = useCallback((stepId, collected) => {
    const schema = wizardSchemaRef.current;
    const trip = useTripStore.getState();
    const tour = useTourGuideStore.getState();

    const isFilled = (id: string) => {
      // Use the reactive variables from component scope (destination, startDate, etc.)
      const storeVal = (id === 'tripType' ? (useTripStore.getState().travelType || tourGuide.trip_style) :
                       (id === 'specificDest' ? (destination || tourGuide.destination) : 
                       (id === 'origin' ? (origin || tourGuide.from_city) : 
                       (id === 'startDate' ? (startDate || tourGuide.departure_date) : 
                       (id === 'endDate' ? (endDate || tourGuide.return_date) : 
                       (id === 'targetBudget' ? (useTripStore.getState().targetBudget || tourGuide.budget) : 
                       (id === 'adults' ? (useTripStore.getState().adults || tourGuide.party_size.adults) : 
                       (id === 'kids' ? (useTripStore.getState().kids || tourGuide.party_size.kids) : ''))))))));
      
      const val = collected[id] || storeVal;

      // Skip Return Date if it's a Single Trip
      if (id === 'endDate') {
        const type = collected['tripType'] || useTripStore.getState().travelType || tourGuide.trip_style;
        if (type === 'single' || type === 'single-trip') return true;
      }
      
      if (!val && val !== 0) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      if (id === 'origin' && val === 'India') return false;
      return true;
    };

    let nextStep: WizardField | null | undefined;
    if (stepId === '__done__') {
      nextStep = null;
    } else {
      const startIdx = schema.findIndex((s: WizardField) => s.id === stepId);
      nextStep = schema.slice(startIdx).find((s: WizardField) => !isFilled(s.id));
    }

    if (!nextStep) {
      // ── All done: build summary from schema labels + collected data ──────
      const lines = schema
        .map((f: WizardField) => {
          const v = collected[f.id] || (f.id === 'tripType' ? (trip.travelType || tour.trip_style) :
                   (f.id === 'specificDest' ? (trip.destination || tour.destination) : 
                   (f.id === 'origin' ? (trip.origin || tour.from_city) : 
                   (f.id === 'startDate' ? (trip.startDate || tour.departure_date) : 
                   (f.id === 'endDate' ? (trip.endDate || tour.return_date) : 
                   (f.id === 'targetBudget' ? (trip.targetBudget || tour.budget) : 
                   (f.id === 'adults' ? (trip.adults || tour.party_size.adults) : 
                   (f.id === 'kids' ? (trip.kids || tour.party_size.kids) : ''))))))));
          if (!v && v !== 0) return null;
          // Skip endDate from summary if single trip
          if (f.id === 'endDate') {
            const type = collected['tripType'] || trip.travelType || tour.trip_style;
            if (type === 'single' || type === 'single-trip') return null;
          }
          return `${f.emoji ?? '•'} **${f.label}**: ${v}`;
        })
        .filter(Boolean)
        .join('\n');

      if (wizardStepRef.current !== 'done') {
        // Just finish silently, the Planner page will fire the summary once results are ready
        setWizardStep('done');
        useAIBrainStore.getState().setWizardMode(false);
      }
      return;
    }

    setWizardStep(nextStep.id);
    const chips = buildChips(nextStep, collected);
    addMessage({
      role: 'assistant',
      content: `${nextStep.emoji ? nextStep.emoji + ' ' : ''}${nextStep.question}`,
      quickReplies: chips,
    } as any);

    // VOICE: Speak the question if in voice mode
    if (useVoiceModeRef.current) {
      speakResponseRef.current?.(nextStep.question);
    }
  }, [addMessage, buildChips]);

  useEffect(() => { injectWizardQuestionRef.current = injectWizardQuestion; }, [injectWizardQuestion]);


  // ── Generic: start wizard ──────────────────────────────────────────────────
  const startWizard: () => void = useCallback(() => {
    const schema = wizardSchemaRef.current;
    if (!schema || schema.length === 0) return;
    if (wizardStepRef.current && wizardStepRef.current !== 'done') return;
    if (wizardStartingRef.current) return;
    wizardStartingRef.current = true;

    const trip = useTripStore.getState();
    const tour = useTourGuideStore.getState();
    const initialData: Record<string, any> = {};
    if (trip.destination || tour.destination) initialData.specificDest = trip.destination || tour.destination;
    if (trip.origin || tour.from_city) initialData.origin = trip.origin || tour.from_city;
    if (trip.startDate || tour.departure_date) initialData.startDate = trip.startDate || tour.departure_date;
    if (trip.endDate || tour.return_date) initialData.endDate = trip.endDate || tour.return_date;
    if (trip.targetBudget || tour.budget) initialData.targetBudget = trip.targetBudget || tour.budget;
    if (trip.adults || tour.party_size.adults) initialData.adults = trip.adults || tour.party_size.adults;
    
    clearHistory();
    setWizardData(initialData);
    addMessage({ role: 'assistant', content: t('wizard_greeting', 'Namaste Traveller') });
    
    setTimeout(() => {
      const nextStep = schema.find((s: WizardField) => true);
      if (nextStep) {
        setWizardStep(nextStep.id);
        injectWizardQuestionRef.current?.(nextStep.id, {});
      } else {
        setWizardStep('done');
        setPlannerStage('suggestions');
        addMessage({ role: 'assistant', content: t('wizard_success', "✅ Great! I've updated your trip details. You can now see the best options in the **Options** tab.") });
      }
      wizardStartingRef.current = false;
    }, 800);
  }, [addMessage, injectWizardQuestion, destination, origin, startDate, endDate, tourGuide]);

  // ── Generic: handle answer for current step ────────────────────────────────
  const handleWizardAnswer = useCallback((text: string) => {
    const currentStepId = wizardStepRef.current;
    if (!currentStepId || currentStepId === 'done') return false;

    const schema = wizardSchemaRef.current;
    const step = schema.find((s: WizardField) => s.id === currentStepId);
    if (!step) return false;

    // Let the field's own parse function handle the text
    const parsed = step.parse(text.trim(), wizardData);
    const newData = { ...wizardData, [step.id]: parsed };
    setWizardData(newData);

    // Push value into the page's form via registered handler
    const handler = useAIBrainStore.getState().inputUpdateHandler;
    if (handler) handler(step.id, parsed);

    // Echo user message
    addMessage({ role: 'user', content: text.trim() });

    // Confirm then advance
    const confirmText = step.confirm(parsed);
    const stepIdx = schema.findIndex((s: WizardField) => s.id === currentStepId);
    const nextStep = schema[stepIdx + 1];
    const nextId = nextStep?.id ?? '__done__';

    setTimeout(() => {
      addMessage({ role: 'assistant', content: confirmText });
      if (useVoiceModeRef.current) {
        speakResponseRef.current?.(confirmText);
      }
      setTimeout(() => {
        const isDone = nextId === '__done__';
        setWizardStep(isDone ? 'done' : nextId);
        if (isDone) {
          setPlannerStage('suggestions');
          setTimeout(() => {
            addMessage({ role: 'assistant', content: t('wizard_success', "✅ Great! I've updated your trip details. You can now see the best options in the **Options** tab.") });
          }, 800);
        }
        injectWizardQuestionRef.current?.(nextId, newData);
      }, 350);
    }, 300);

    return true;
  }, [addMessage, wizardData, setWizardData, setWizardStep]);

  useEffect(() => { handleWizardAnswerRef.current = handleWizardAnswer; }, [handleWizardAnswer]);


  // ── Auto-start when isWizardMode + panel opens + schema is ready ───────────

  // ── Auto-greeting when panel opens ──────────────────────────────────────────
  const lastAcknowledgedDest = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const dest = destination || tourGuide.destination;
      const greeting = dest 
        ? t('ai_greeting_context', `Namaste! I see you're planning a trip to **${dest}**. I'm your Travel Guide, ready to help with everything from ${origin ? `travel from ${origin}` : 'flights'} to local street food hacks. What's on your mind?`)
        : t('ai_greeting', "Namaste! I'm your Travel Guide. I'm here to help you plan your perfect trip across India. Where would you like to explore today?");
      
      addMessage({ role: 'assistant', content: greeting });
      lastAcknowledgedDest.current = dest || null;
    }
  }, [isOpen, messages.length, destination, tourGuide.destination, origin, t, addMessage]);

  // Clear history if destination changes drastically to prevent "talking about other location"
  useEffect(() => {
    const currentDest = destination || tourGuide.destination;
    if (currentDest && lastAcknowledgedDest.current && currentDest !== lastAcknowledgedDest.current && messages.length > 0) {
      // If the destination changed and we have an existing conversation, clear it to keep context fresh
      clearHistory();
      lastAcknowledgedDest.current = currentDest;
    } else if (currentDest && !lastAcknowledgedDest.current) {
      lastAcknowledgedDest.current = currentDest;
    }
  }, [destination, tourGuide.destination, clearHistory, messages.length]);


  // ── Auto-activate AI Brain when destination is selected ─────────────────────
  const lastAutoActivatedDest = useRef<string | null>(null);

  // Multilingual greeting templates
  const buildDestinationGreeting = useCallback((dest: string, from: string, budgetStr: string, lang: string): string => {
    const templates: Record<string, (d: string, f: string, b: string) => string[]> = {
      hi: (d, f, b) => [
        `बढ़िया चुनाव! **${d}** एक शानदार जगह है। 🌟`,
        f ? `मैं देख रहा हूँ कि आप **${f}** से यात्रा कर रहे हैं।` : '',
        b ? `**${b}** के बजट में मैं आपकी बेहतरीन यात्रा प्लान करूँगा।` : '',
        `क्या आप **घूमने का सबसे अच्छा समय**, **स्थानीय आकर्षण**, या **तारीखें तय करने** में मदद चाहते हैं?`,
      ],
      ta: (d, f, b) => [
        `அருமையான தேர்வு! **${d}** ஒரு அற்புதமான இடம். 🌟`,
        f ? `நீங்கள் **${f}** இலிருந்து பயணிக்கிறீர்கள் என்று பார்க்கிறேன்.` : '',
        b ? `**${b}** பட்ஜெட்டில் சிறந்த பயணத்தை திட்டமிட உதவுகிறேன்.` : '',
        `**சிறந்த நேரம்**, **உள்ளூர் சிறப்புகள்**, அல்லது **தேதிகள்** தேர்வு செய்ய உதவட்டுமா?`,
      ],
      mr: (d, f, b) => [
        `उत्तम निवड! **${d}** एक अप्रतिम ठिकाण आहे. 🌟`,
        f ? `मला दिसतं की तुम्ही **${f}** वरून प्रवास करत आहात.` : '',
        b ? `**${b}** च्या बजेटमध्ये मी तुमची सुंदर सहल आखतो.` : '',
        `**सर्वोत्तम वेळ**, **स्थानिक आकर्षणे**, किंवा **तारखा** निवडण्यात मदत हवी आहे का?`,
      ],
      kn: (d, f, b) => [
        `ಅದ್ಭುತ ಆಯ್ಕೆ! **${d}** ಒಂದು ಅಪೂರ್ವ ತಾಣ. 🌟`,
        f ? `ನೀವು **${f}** ನಿಂದ ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದೀರಿ ಎಂದು ಕಾಣುತ್ತಿದೆ.` : '',
        b ? `**${b}** ಬಜೆಟ್‌ನಲ್ಲಿ ಅತ್ಯುತ್ತಮ ಪ್ರವಾಸ ಯೋಜಿಸುತ್ತೇನೆ.` : '',
        `**ಉತ್ತಮ ಸಮಯ**, **ಸ್ಥಳೀಯ ಆಕರ್ಷಣೆಗಳು**, ಅಥವಾ **ದಿನಾಂಕ** ಆಯ್ಕೆಯಲ್ಲಿ ಸಹಾಯ ಬೇಕೇ?`,
      ],
      bn: (d, f, b) => [
        `দারুণ পছন্দ! **${d}** একটি অসাধারণ গন্তব্য। 🌟`,
        f ? `আমি দেখছি আপনি **${f}** থেকে যাত্রা করছেন।` : '',
        b ? `**${b}** বাজেটে আমি আপনার সেরা ভ্রমণ পরিকল্পনা করব।` : '',
        `**সেরা সময়**, **স্থানীয় আকর্ষণ**, বা **তারিখ নির্বাচনে** সাহায্য করব?`,
      ],
      te: (d, f, b) => [
        `అద్భుతమైన ఎంపిక! **${d}** చాలా అందమైన ప్రదేశం. 🌟`,
        f ? `మీరు **${f}** నుండి ప్రయాణిస్తున్నారని చూస్తున్నాను.` : '',
        b ? `**${b}** బడ్జెట్‌లో మీకు ఉత్తమ ప్రయాణాన్ని ప్లాన్ చేస్తాను.` : '',
        `**సరైన సమయం**, **స్థానిక విశేషాలు**, లేదా **తేదీలు** ఎంచుకోవడంలో సహాయం చేయమా?`,
      ],
      gu: (d, f, b) => [
        `સરસ પસંદ! **${d}** એક અદ્ભૂત સ્થળ છે. 🌟`,
        f ? `હું જોઉ છું કે તમે **${f}** થી પ્રવાસ કરો છો.` : '',
        b ? `**${b}** ના બજેટમાં હું તમારી શ્રેષ્ઠ સફર ગોઠવીશ.` : '',
        `**શ્રેષ્ઠ સમય**, **સ્થાનિક આકર્ષણો**, અથવા **તારીખ** પસંદ કરવામાં મદદ જોઈએ?`,
      ],
      ml: (d, f, b) => [
        `മനോഹരമായ തിരഞ്ഞെടുപ്പ്! **${d}** അൽഭുതകരമായ ഒരു ലക്ഷ്യസ്ഥാനം. 🌟`,
        f ? `നിങ്ങൾ **${f}** ൽ നിന്ന് യാത്ര ചെയ്യുകയാണ് എന്ന് ഞാൻ കാണുന്നു.` : '',
        b ? `**${b}** ബജറ്റിൽ ഏറ്റവും മികച്ച യാത്ര ആസൂത്രണം ചെയ്യാം.` : '',
        `**ഏറ്റവും നല്ല സമയം**, **പ്രാദേശിക ആകർഷണങ്ങൾ**, അല്ലെങ്കിൽ **തീയതികൾ** തിരഞ്ഞെടുക്കാൻ സഹായിക്കട്ടെ?`,
      ],
      pa: (d, f, b) => [
        `ਵਧੀਆ ਚੋਣ! **${d}** ਇੱਕ ਸ਼ਾਨਦਾਰ ਮੰਜ਼ਿਲ ਹੈ। 🌟`,
        f ? `ਮੈਂ ਦੇਖ ਰਿਹਾ ਹਾਂ ਕਿ ਤੁਸੀਂ **${f}** ਤੋਂ ਸਫ਼ਰ ਕਰ ਰਹੇ ਹੋ।` : '',
        b ? `**${b}** ਬਜਟ ਵਿੱਚ ਮੈਂ ਤੁਹਾਡੀ ਵਧੀਆ ਯਾਤਰਾ ਬਣਾਵਾਂਗਾ।` : '',
        `**ਸਭ ਤੋਂ ਵਧੀਆ ਸਮਾਂ**, **ਸਥਾਨਕ ਖਿੱਚ**, ਜਾਂ **ਤਾਰੀਖਾਂ** ਚੁਣਨ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?`,
      ],
      en: (d, f, b) => [
        `Great choice! **${d}** is a wonderful destination. 🌟`,
        f ? `I see you're travelling from **${f}**.` : '',
        b ? `With a budget of **${b}**, I can help you plan the perfect trip.` : '',
        `Would you like me to tell you the **best time to visit**, **local highlights**, or help you **pick your travel dates**?`,
      ],
    };

    const fn = templates[lang] || templates['en'];
    return fn(dest, from, budgetStr).filter(Boolean).join(' ');
  }, []);

  useEffect(() => {
    const currentDest = (destination || tourGuide.destination || '').trim();
    if (!currentDest || currentDest.length < 2) return;
    if (currentDest === lastAutoActivatedDest.current) return;
    lastAutoActivatedDest.current = currentDest;

    setOpen(true);

    const timer = setTimeout(() => {
      const from = origin || tourGuide.from_city || '';
      const budget = tourGuide.budget || useTripStore.getState().targetBudget || 0;
      const budgetStr = budget ? `₹${Number(budget).toLocaleString('en-IN')}` : '';
      const greeting = buildDestinationGreeting(currentDest, from, budgetStr, language || 'en');
      addMessage({ role: 'assistant', content: greeting });
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, tourGuide.destination]);



  useEffect(() => {
    if (!VOICE_FORCE_SERVER_STT) return;
    speechNetworkBlockedRef.current = true;
    setServerVoiceFallbackUi(true);
  }, []);

  // Automatically enable audio feedback + guide user when voice mode is activated
  useEffect(() => {
    if (useVoiceMode) {
      setAudioFeedback(true);
      toast.message('🎤 Voice Mode On', {
        description: 'Tap the mic button below to start speaking. Tap again to stop.',
        duration: 4000,
      });
    }
  }, [useVoiceMode]);



  // ── Dynamic Prompts ─────────────────────────────────────────────────────────
  const dynamicPrompts = useMemo(() => {
    const basePrompts = [
      {
        icon: Thermometer,
        label: 'Weather',
        prompt: (destination || tourGuide.destination) ? `What is the weather like in ${destination || tourGuide.destination} right now?` : 'What is the current weather and best time to visit India?'
      },
      {
        icon: Wallet,
        label: 'Budget tips',
        prompt: destination ? `Give me 3 budget travel tips for ${destination} under ₹5,000 per day.` : 'Give me 3 budget travel tips for my trip.'
      }
    ];

    if (plannerStage === 'suggestions') {
      return [
        {
          icon: Sparkles,
          label: 'Compare these',
          prompt: 'Help me compare these destination options. Which one offers the best value for my budget?'
        },
        {
          icon: Compass,
          label: 'Hidden Gems',
          prompt: destination ? `Are there any offbeat or hidden gems near ${destination} that I should consider?` : 'Suggest some offbeat hidden gems in India.'
        },
        ...basePrompts
      ];
    }

    if (plannerStage === 'selection' || plannerStage === 'results') {
      const missing = !mixPicks.transport ? 'transport' : (!mixPicks.hotel ? 'hotel' : null);
      return [
        {
          icon: Zap,
          label: 'Optimize Plan',
          prompt: 'Review my current selections in the Odyssey Cart. Are there any better combinations for my budget?'
        },
        ...(missing ? [{
          icon: Info,
          label: `Find ${missing}`,
          prompt: `I haven't picked a ${missing} yet. Show me the best ${missing} options from the marketplace.`
        }] : []),
        {
          icon: Utensils,
          label: 'Local Food',
          prompt: destination ? `What are the must-try local dishes in ${destination}?` : 'What are the must-try local dishes?'
        },
        ...basePrompts
      ];
    }

    if (plannerStage === 'booking') {
      return [
        {
          icon: ShieldCheck,
          label: 'Insurance Info',
          prompt: 'Tell me more about the Yatra Shield protection. What does it cover?'
        },
        {
          icon: Send,
          label: 'Next Steps',
          prompt: 'I am about to finalize my booking. What happens after I pay?'
        },
        ...basePrompts
      ];
    }

    return [
      {
        icon: Hotel,
        label: '5 Best Hotels',
        prompt: destination ? `Find me the 5 highest-rated hotels in ${destination} for ${startDate || 'my trip'} within budget. Return them as [SELECT: stay=index] items.` : 'Show me top 5 hotel options for my trip.'
      },
      ...basePrompts
    ];
  }, [origin, destination, startDate, plannerStage, mixPicks]);




  // ── History loading disabled for "Clean State" policy ──
  /*
  useEffect(() => {
    async function loadHistory() {
      if (!user?.id) return;
      const { data, error } = await supabase.from('yatra_ai_chat_history').select('role, content, created_at').eq('user_id', user.id).order('created_at', { ascending: true }).limit(20);
      if (error) return;
      if (data && data.length > 0 && messages.length === 0) {
        data.forEach(msg => { addMessage({ role: msg.role as any, content: msg.content }); });
      }
    }
    loadHistory();
  }, [user?.id, addMessage]);
  */

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // ── Hand-in-hand refs (useEffect placed after sendMessage declaration below) ──
  const prevMixPicksRef = useRef<typeof mixPicks>(mixPicks);



  useEffect(() => {
    if (useVoiceMode) return;
    try {
      const rec = serverRecorderRef.current;
      if (rec && rec.state === 'recording') {
        rec.onstop = null;
        rec.stop();
      }
    } catch {
      /* noop */
    }
    serverRecorderRef.current = null;
    serverChunksRef.current = [];
    serverStreamRef.current?.getTracks().forEach((t) => t.stop());
    serverStreamRef.current = null;
    setIsServerVoiceRecording(false);
  }, [useVoiceMode]);

  // Sync clear history with DB
  const clearChatHistory = async () => {
    clearHistory();
    if (user?.id) {
      await supabase.from('yatra_ai_chat_history').delete().eq('user_id', user.id);
    }
  };

  // Auto-focus text input when panel opens (not in voice mode)
  useEffect(() => {
    if (isOpen && !useVoiceMode) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen, useVoiceMode]);

  // Request mic permission and activate voice-first if allowed
  useEffect(() => {
    if (isOpen && !isListening && messages.length === 0) {
      if (typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const hasMic = devices.some(d => d.kind === 'audioinput');
          if (hasMic && !useVoiceMode) {
            // Keep voice mode opt-in without intrusive background alert.
          }
        });
      }
    }
  }, [isOpen]);

  const isEmpty = messages.length === 0;

  // ── Streaming send (with wizard intercept) ──────────────────────────────────
  const sendMessage = useCallback(async (
    text: string,
    isFromVoice = false,
    opts?: { destinationBriefFormat?: boolean },
  ) => {
    if (!text.trim() || isStreaming || isSendingRef.current) return;

    // ── Wizard Mode: handle locally, no API call ─────────────────────────────
    if (wizardStepRef.current && wizardStepRef.current !== 'done') {
      setInputValue('');
      handleWizardAnswerRef.current?.(text);
      return;
    }

    const destinationBriefFormat = opts?.destinationBriefFormat === true;

    isSendingRef.current = true;
    setStreaming(true); // Lock immediately
    setInputValue(''); // Clear immediately to feel responsive

    const userMsg = { role: 'user' as const, content: text.trim() };
    addMessage(userMsg);
    setSelectedImage(null);

    // Placeholder for streaming AI response
    addMessage({ role: 'assistant', content: '', isStreaming: true });

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();


    try {
      const resp = await fetch('/api/ai-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          image: selectedImage, // Base64 image data
            context: {
              ...context,
              useVoiceMode, // Pass Voice mode state for Brevity Logic
              uiLanguage: language,
              replyLanguage: language, // Explicitly request reply in selected language
              userName: user?.user_metadata?.full_name || 'Traveler',
              targetBudget: useTripStore.getState().targetBudget,
              travelType: useTripStore.getState().travelType,
              tripStartDate: startDate,
              tripEndDate: endDate,
              plannerStage,
              persona,
              user_persona: storePersona,
              likes: storeLikes,
              dislikes: storeDislikes,
              activePNR,
            // TripPlanner real-time context
            selectedPlan: activeItinerary ? {
              tierLabel: activeItinerary.tierLabel,
              from: activeItinerary.from,
              to: activeItinerary.to,
              total: activeItinerary.total,
              nights: activeItinerary.nights,
              transport: activeItinerary.transport,
              hotel: activeItinerary.hotel,
              local: activeItinerary.local,
            } : null,
            odysseyCart: {
              transport: mixPicks.transport ? { name: mixPicks.transport.name, price: mixPicks.transport.price, type: mixPicks.transport.type } : 'Not selected',
              hotel: mixPicks.hotel ? { name: mixPicks.hotel.name, price: mixPicks.hotel.price } : 'Not selected',
              returnTransport: mixPicks.returnTransport ? { name: mixPicks.returnTransport.name, price: mixPicks.returnTransport.price } : null,
              totalSelectedValue: (
                (parseInt(String(mixPicks.transport?.price || '0').replace(/[₹,]/g, '')) || 0) +
                (parseInt(String(mixPicks.returnTransport?.price || '0').replace(/[₹,]/g, '')) || 0) +
                ((parseInt(String(mixPicks.hotel?.price || '0').replace(/[₹,]/g, '')) || 0) * (activeItinerary?.nights || 1))
              )
            },
            // Full itinerary for day-plan awareness
            activeItineraryFull: activeItinerary ? {
              from: activeItinerary.from,
              to: activeItinerary.to,
              nights: activeItinerary.nights,
              tierLabel: activeItinerary.tierLabel,
              total: activeItinerary.total,
              totalEstimate: activeItinerary.totalEstimate,
              days: activeItinerary.days || [],
            } : null,
            tripTiers: tiers.length > 0 ? tiers.map(t => ({ label: t.label, total: t.total, transport: t.transport, hotel: t.hotel, local: t.local })) : null,
            plannerSearchData: (searchData.flights.length > 0 || searchData.trains.length > 0 || searchData.hotels.length > 0 || searchData.buses?.length > 0) ? {
              flightCount: searchData.flights.length,
              trainCount: searchData.trains.length,
              hotelCount: searchData.hotels.length,
              busCount: searchData.buses?.length || 0,
              ferryCount: searchData.ferries?.length || 0,
              trains: searchData.trains.slice(0, 10),
              flights: searchData.flights.slice(0, 10),
              hotels: searchData.hotels.slice(0, 10),
              buses: searchData.buses?.slice(0, 10),
              ferries: searchData.ferries?.slice(0, 10)
            } : null,
            // Premium Intelligence: Grounding in Indian Cultural Nuance
            grounding: {
              culturalSignificance: true,
              festivalAwareness: true,
              localEtiquette: true,
              personaRole: persona,
              isOdysseyCartActive: plannerStage === 'selection' || plannerStage === 'results'
            },
            weather: weather ? {
              temp: weather.temp,
              condition: weather.condition,
              humidity: weather.humidity,
              wind: weather.wind,
              feelsLike: weather.feelsLike,
            } : null,

            // system prompt can ground responses in the live trip object
            language:          tourGuide.language,
            from_city:         tourGuide.from_city,
            destination:       tourGuide.destination,
            departure_date:    tourGuide.departure_date,
            return_date:       tourGuide.return_date,
            budget:            tourGuide.budget,
            party_size:        tourGuide.party_size,
            preferences:       tourGuide.preferences,
            features:          tourGuide.features,
            trip_style:        tourGuide.trip_style,
            constraints:       tourGuide.constraints,
            discovered_tours:  tourGuide.discovered_tours,
            selected_tour:     tourGuide.selected_tour,
            conversation_summary: tourGuide.conversation_summary,
            ...(destinationBriefFormat ? { destinationBriefFormat: true } : {}),
          },
          userId: user?.id,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) updateLastMessage(parsed.delta);
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* malformed SSE chunk, skip */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateLastMessage('\n\n⚠️ Connection interrupted. Please try again.');
        toast.error('AI Brain lost connection');
      }
    } finally {
      finalizeLastMessage();
      setStreaming(false);
      isSendingRef.current = false;

      // ── Hand-in-Hand: Check for structured updates [UPDATE: field=value] ────
      const currentMessages = useAIBrainStore.getState().messages;
      const lastMsg = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1].content : null;
      
      if (lastMsg && lastMsg.includes('[UPDATE:')) {
        const matches = lastMsg.matchAll(/\[UPDATE:\s*(.*?)=(.*?)\]/g);
        let updatedCount = 0;
        for (const match of matches) {
          const field = match[1].trim();
          const value = match[2].trim();
          const handler = useAIBrainStore.getState().inputUpdateHandler;
          if (handler) {
            handler(field, isNaN(Number(value)) ? value : Number(value));
            updatedCount++;
          }
        }
        if (updatedCount > 0) {
          // Silent auto-sync; UI/state already reflects updates.
        }
      }

      // ── Speak response ONLY when user input came from voice (mic) ────────
      // Text input always gets a text-only reply — never auto-speaks.
      if (lastMsg && isFromVoice) {
        speakResponseRef.current?.(lastMsg);
      }
    }
  }, [isStreaming, messages, context, user, language, destination, startDate, addMessage, updateLastMessage, finalizeLastMessage, setStreaming, useVoiceMode, audioFeedback]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  // ── Hand-in-hand: react when user picks hotel or transport in planner ────────
  useEffect(() => {
    const prev = prevMixPicksRef.current;
    prevMixPicksRef.current = mixPicks;

    const transportChanged = mixPicks.transport?.name !== prev.transport?.name;
    const returnChanged    = mixPicks.returnTransport?.name !== prev.returnTransport?.name;
    const hotelChanged     = mixPicks.hotel?.name !== prev.hotel?.name;

    if (!transportChanged && !returnChanged && !hotelChanged) return;

    // ── Hotel selected: open AI Brain + inject proximity-ready greeting ─────
    if (hotelChanged && mixPicks.hotel) {
      const hotelName = mixPicks.hotel.name;
      const dest      = tourGuide.destination || destination || 'your destination';
      const lang      = language || 'en';

      const hotelMsgs: Record<string, string> = {
        hi:  `🏨 **${hotelName}** बुक हो गया! अब आप मुझसे पूछ सकते हैं — पास के रेस्टोरेंट, बाज़ार, मंदिर या कोई भी जगह कितनी दूर है और वहाँ जाने का सबसे अच्छा तरीका क्या है।`,
        ta:  `🏨 **${hotelName}** தேர்ந்தெடுக்கப்பட்டது! இப்போது அருகில் உள்ள உணவகங்கள், சந்தைகள் அல்லது எந்த இடமும் எவ்வளவு தூரம் என்று என்னிடம் கேளுங்கள்.`,
        mr:  `🏨 **${hotelName}** निवडले! आता जवळचे रेस्टॉरंट, बाजार किंवा कोणतीही जागा किती दूर आहे ते मला विचारा — मी अंतर आणि सर्वोत्तम मार्ग सांगतो.`,
        kn:  `🏨 **${hotelName}** ಆಯ್ಕೆಯಾಗಿದೆ! ಹತ್ತಿರದ ರೆಸ್ಟೋರೆಂಟ್, ಮಾರ್ಕೆಟ್ ಅಥವಾ ಯಾವುದೇ ಸ್ಥಳ ಎಷ್ಟು ದೂರ ಎಂದು ನನ್ನನ್ನು ಕೇಳಿ.`,
        bn:  `🏨 **${hotelName}** বেছে নেওয়া হয়েছে! এখন কাছের রেস্তোরাঁ, বাজার বা যেকোনো জায়গা কত দূর তা আমাকে জিজ্ঞেস করুন।`,
        te:  `🏨 **${hotelName}** ఎంచుకోబడింది! దగ్గరలో ఉన్న రెస్టారెంట్లు, మార్కెట్లు లేదా ఏ స్థలమైనా ఎంత దూరం అని నన్ను అడగండి.`,
        gu:  `🏨 **${hotelName}** પસંદ થઈ ગઈ! નજીકના રેસ્ટોરાં, બજાર કે કોઈ પણ જગ્યા કેટલી દૂર છે — મને પૂછો, હું અંતર અને શ્રેષ્ઠ રસ્તો જણાવીશ.`,
        ml:  `🏨 **${hotelName}** തിരഞ്ഞെടുത്തു! അടുത്തുള്ള റസ്റ്റോറന്റ്, മാർക്കറ്റ് അല്ലെങ്കിൽ ഏത് സ്ഥലവും എത്ര ദൂരമാണ് എന്ന് എന്നോട് ചോദിക്കൂ.`,
        pa:  `🏨 **${hotelName}** ਚੁਣਿਆ ਗਿਆ! ਹੁਣ ਨੇੜੇ ਦੇ ਰੈਸਟੋਰੈਂਟ, ਬਾਜ਼ਾਰ ਜਾਂ ਕਿਸੇ ਵੀ ਜਗ੍ਹਾ ਤੋਂ ਦੂਰੀ ਬਾਰੇ ਮੈਨੂੰ ਪੁੱਛੋ।`,
        en:  `🏨 **${hotelName}** selected in **${dest}**! I'm now your local guide for this hotel. Ask me anything like:\n- *"Best restaurants near my hotel?"*\n- *"How far is [place] from ${hotelName}?"*\n- *"Best way to get to the beach?"*\n\nI'll give you exact distances and the best transport options. 🗺️`,
      };

      const msg = hotelMsgs[lang] || hotelMsgs['en'];

      // Open panel and inject message directly (no API call needed)
      setOpen(true);
      const t = setTimeout(() => addMessage({ role: 'assistant', content: msg }), 400);
      return () => clearTimeout(t);
    }

    // ── Transport selected: fire API for a real contextual tip (only if panel is open) ──
    if ((transportChanged || returnChanged) && isOpen) {
      const parts: string[] = [];
      if (transportChanged && mixPicks.transport)
        parts.push(`I selected ${mixPicks.transport.name} (${mixPicks.transport.price}) as my ${mixPicks.transport.label || 'transport'}.`);
      if (returnChanged && mixPicks.returnTransport)
        parts.push(`Return: ${mixPicks.returnTransport.name} (${mixPicks.returnTransport.price}).`);
      if (!parts.length) return;
      const msg = parts.join(' ') + ' Give me one quick practical tip.';
      const t = setTimeout(() => sendMessageRef.current?.(msg), 500);
      return () => clearTimeout(t);
    }
  }, [mixPicks, plannerStage, isOpen, destination, tourGuide.destination, language, addMessage, setOpen]);
  
  // ── Stage-aware Auto-Open: AI Brain activates when moving to specific stages ──
  const prevStageRef = useRef(plannerStage);
  useEffect(() => {
    const prev = prevStageRef.current;
    prevStageRef.current = plannerStage;

    if (plannerStage === prev) return;

    // Transition to results: destination selected and itinerary drafted
    const targetDest = destination || activeItinerary?.destination || activeItinerary?.to;

    if (plannerStage === 'results' && targetDest) {
      setOpen(true);
      const t = setTimeout(() => {
        const weatherText = activeItinerary?.weather?.temp 
          ? `The weather looks **${activeItinerary.weather.temp}** and **${activeItinerary.weather.condition || 'pleasant'}**.`
          : "I'm checking the local conditions for you now.";
        
        const datesText = (activeItinerary?.startDate && activeItinerary?.endDate)
          ? `from **${isoToDdMonthYy(activeItinerary.startDate)}** to **${isoToDdMonthYy(activeItinerary.endDate)}**`
          : "for your selected dates";

        addMessage({ 
          role: 'assistant', 
          content: `\u2728 **Excellent choice!** I've drafted your custom Odyssey for **${targetDest}** ${datesText}.\n\n🌡️ ${weatherText}\n\nI've mapped out the full itinerary for you. Should we upgrade any of the hotels, or does this look perfect?`
        });
      }, 800);
      return () => clearTimeout(t);
    }

    // Transition to suggestions: user provided inputs, showing city options
    if (plannerStage === 'suggestions' && targetDest) {
      setOpen(true);
      const t = setTimeout(() => {
        addMessage({ 
          role: 'assistant', 
          content: `\ud83d\udccd Great choice! **${targetDest}** is a fantastic pick. I've fetched some curated options for you. \n\nWhich of these looks most like your dream trip? I can help you compare them if you're undecided!`
        });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [plannerStage, destination, activeItinerary, setOpen, addMessage]);

  // Planner / chips can queue a message when opening chat — flush via real send so assistant replies stream.
  useEffect(() => {
    const queued = pendingOutbound;
    const raw = queued?.text?.trim();
    if (!isOpen || !raw) return;
    if (isStreaming || isSendingRef.current) return;
    const brief = queued?.destinationBriefFormat === true;
    setPendingOutbound(null);
    void sendMessage(raw, false, brief ? { destinationBriefFormat: true } : undefined);
  }, [isOpen, pendingOutbound, isStreaming, sendMessage, setPendingOutbound]);





  if (!mounted) return null;

  const hasContext = destination && startDate && destination.trim().length > 2;

  // ── Panel ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className={`fixed z-[9999] transition-all duration-500 ease-in-out no-print ${
        isPrimarySidebarOpen
          ? 'top-16 right-0 bottom-0 w-[100vw] lg:w-[380px] h-auto'
          : 'bottom-8 right-8'
      }`}
      drag={!isPrimarySidebarOpen}
      dragConstraints={{ left: -1000, right: 30, top: -800, bottom: 30 }}
      dragElastic={0.1}
      dragMomentum={false}
      style={{ touchAction: 'none' }}
    >
      <AnimatePresence>
        {(isOpen || isPrimarySidebarOpen) && (
          <motion.div
            initial={isPrimarySidebarOpen ? { x: 420 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={isPrimarySidebarOpen ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isPrimarySidebarOpen ? { x: 420 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className={`relative ${
              isPrimarySidebarOpen
                ? 'w-full h-full rounded-none border-l-4 border-[#FFD700]'
                : 'absolute bottom-[76px] right-0 w-[92vw] sm:w-[430px] lg:w-[460px] max-w-[92vw] h-[72vh] max-h-[760px] min-h-[520px] rounded-[32px] p-[3px] bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#9E7E38] shadow-[0_30px_100px_rgba(0,0,0,0.15),0_0_30px_rgba(255,215,0,0.3)]'
            } flex flex-col overflow-hidden`}
          >
            <div className={`flex flex-col h-full w-full bg-white/85 backdrop-blur-[40px] ${!isPrimarySidebarOpen ? 'rounded-[29px]' : ''} overflow-hidden relative`}>
            {/* ── Siri-Style Animated Background (Light Mode) ── */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  x: [0, 50, 0],
                  y: [0, -30, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#FF9933]/20 rounded-full blur-[80px]" 
              />
              <motion.div 
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  x: [0, -60, 0],
                  y: [0, 40, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#138808]/10 rounded-full blur-[100px]" 
              />
              <motion.div 
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-[#FF9933]/15 rounded-full blur-[60px]" 
              />
            </div>

            <div className="relative z-10 flex flex-col h-full">

              {/* Trip Info Bar: Displayed when destination is set */}
              {destination && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="shrink-0 flex items-center gap-4 px-4 py-2 bg-saffron/5 border-b border-orange-100/50"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <MapPin className="w-3 h-3 text-saffron shrink-0" />
                    <span className="text-[10px] font-black text-[#000080] uppercase tracking-tighter truncate">{destination}</span>
                  </div>
                  {startDate && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Calendar className="w-3 h-3 text-green" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{isoToDdMonthYy(startDate)}</span>
                    </div>
                  )}
                  {weather?.temp && (
                    <div className="flex items-center gap-1.5 ml-auto shrink-0 bg-white/60 px-2.5 py-1 rounded-full border border-orange-100 shadow-sm">
                      <Thermometer className="w-3 h-3 text-saffron" />
                      <span className="text-[9px] font-black text-saffron">{weather.temp}</span>
                    </div>
                  )}
                </motion.div>
              )}

            {/* ── HEADER ── Gold standard: Siri-style translucent */}
            <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-slate-200 bg-white/[0.02]">
              {/* Identity */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF9933] to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                  <Sparkles className="text-[#000080]" size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-800 tracking-tight">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isStreaming || isListening || isSpeaking ? 'bg-saffron animate-pulse' : 'bg-green'}`} />
                    <span className="text-[9px] text-slate-400 font-medium">
                      {isStreaming ? 'Thinking…' : isSpeaking ? 'Speaking…' : isListening ? 'Listening…' : `${persona} · Ready`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                

                {/* Language Selection Dropdown */}
                <div className="relative group/lang">
                  <button
                    className="p-1.5 text-slate-400 hover:bg-orange-50 hover:text-saffron rounded-lg transition-colors flex items-center gap-1"
                    title="Change language"
                  >
                    <Globe className="w-4 h-4 text-green" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{language?.toUpperCase() || 'EN'}</span>
                  </button>
                  
                  <div className="absolute right-0 bottom-full mb-1 w-48 max-h-60 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl py-1 shadow-2xl opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all z-50 flex flex-col">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-orange-50 transition-colors ${language === lang.code ? 'text-green bg-green/10' : 'text-slate-500'}`}
                      >
                        <span className="font-black normal-case tracking-normal text-[11px]">
                          {lang.native}
                        </span>
                        <span className="text-slate-400 normal-case tracking-normal text-[9px]">
                          {lang.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio feedback */}
                <button
                  onClick={() => {
                    setAudioFeedback(!audioFeedback);
                    if (audioFeedback && audioRef.current) audioRef.current.pause();
                  }}
                  className={`p-1.5 rounded-lg transition-all ${audioFeedback ? 'text-[#FF9933] bg-[#FF9933]/10 border border-[#FF9933]/20' : 'text-slate-400 hover:bg-orange-50 hover:text-saffron'}`}
                  title={audioFeedback ? 'Mute AI voice' : 'Enable AI voice'}
                >
                  {audioFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>



                {/* Clear history */}
                {messages.length > 0 && (
                  <button
                    onClick={() => clearChatHistory()}
                    className="p-1.5 text-slate-400 hover:bg-orange-50 hover:text-saffron rounded-lg transition-colors"
                    title="Clear conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => isPrimarySidebarOpen ? togglePrimarySidebar() : setOpen(false)}
                  className="p-1.5 text-slate-400 hover:bg-orange-50 hover:text-saffron rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>


            {/* ── ACTIVE TRIP CONTEXT BAR ── */}
            {destination && !wizardStep && (
              <div className="shrink-0 flex flex-col gap-1 px-4 py-2 bg-[#FF9933]/5 border-b border-[#FF9933]/10">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-[#FF9933] shrink-0" />
                  <span className="text-[10px] font-bold text-[#000080] truncate">{destination}</span>
                  <span className="ml-auto text-[8px] font-black text-[#FF9933] bg-[#FF9933]/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#FF9933]/15 shrink-0">Active Trip</span>
                </div>
                <div className="flex items-center gap-3 pl-5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-saffron uppercase italic">{isoToDdMonthYy(startDate)}</span>
                    <span className="text-[8px] text-slate-300">→</span>
                    <span className="text-[9px] font-black text-saffron uppercase italic">{isoToDdMonthYy(endDate)}</span>
                  </div>
                  {weather ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/40 rounded-md border border-saffron/10 animate-in fade-in zoom-in duration-500">
                      <img src={weather.icon} alt={weather.condition} className="w-3 h-3" />
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                        {weather.temp}°C {weather.condition}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200/50 rounded-md opacity-40">
                      <Thermometer className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Syncing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Synced Planner Stage Navigator (always visible) */}
            <div className="shrink-0 px-3 py-2 border-b border-slate-100 bg-white/30">
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-1 flex gap-1 overflow-x-auto no-scrollbar">
                {syncedStages.map((st) => {
                  const isActive = plannerStage === st.id;
                  // Clean state policy: Don't allow clicking into stages that haven't been reached yet
                  const STAGE_ORDER = ['inputs', 'suggestions', 'results', 'selection', 'booking', 'success'];
                  const currentIdx = STAGE_ORDER.indexOf(plannerStage || 'inputs');
                  const targetIdx = STAGE_ORDER.indexOf(st.id);
                  
                  // Logic: Once a destination is selected (results or later), 'suggestions' is locked.
                  // The user can only go back to 'inputs' to change parameters, or stay in the selection/booking flow.
                  const isDestinationSelected = ['results', 'selection', 'booking', 'success'].includes(plannerStage || '');
                  
                  // COMPULSORY WIZARD: If the wizard is active, we lock navigation entirely to the current stage.
                  const isWizardActive = isWizardMode && wizardStep && wizardStep !== 'done';

                  let isAccessible = false;
                  if (isWizardActive) {
                    isAccessible = isActive; // Only current tab is accessible
                  } else if (isDestinationSelected) {
                    // Only allow Inputs or the current/past deep stages, but NOT suggestions
                    isAccessible = (st.id === 'inputs' || (targetIdx >= 2 && targetIdx <= currentIdx));
                  } else {
                    // Normal flow: can go to any stage already reached
                    isAccessible = targetIdx <= currentIdx || (st.id === 'results' && searchData.hotels.length > 0);
                  }

                  const isDone = targetIdx < currentIdx && plannerStage !== 'success';
                  const isActuallyDone = isDone || (plannerStage === 'success' && st.id !== 'success');

                  return (
                    <button
                      key={st.id}
                      disabled={!isAccessible}
                      onClick={() => isAccessible && setPlannerStage(st.id as any)}
                      className={`min-w-[64px] px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                        isActive
                          ? 'bg-saffron text-white shadow-[0_4px_12px_rgba(255,103,31,0.3)]'
                          : isActuallyDone
                            ? 'bg-green text-white shadow-[0_4px_12px_rgba(4,106,56,0.2)]'
                            : isAccessible 
                              ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              : 'text-slate-200 cursor-not-allowed opacity-30'
                      }`}
                    >
                      {isActuallyDone && <Check className="w-2 h-2" />}
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── MESSAGES ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {isEmpty ? (
                /* Empty / Welcome state */
                <HomeView
                  sendMessage={sendMessage}
                  activeItinerary={activeItinerary}
                  tiers={tiers}
                  context={context}
                  language={language}
                  setUseVoiceMode={setUseVoiceMode}
                  handleVoiceInput={handleVoiceInput}
                  plannerStage={plannerStage}
                  searchData={searchData}
                  mixPicks={mixPicks}
                  tourGuide={tourGuide}
                />
              ) : (
                messages.map((msg: any, i: number) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    isStreaming={isStreaming}
                    onQuickReply={(chip) => {
                      // Route through sendMessage so wizard intercepts it
                      sendMessage(chip.label);
                    }}
                  />
                ))
              )}
            </div>

            {/* ── INPUT AREA ── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-4 space-y-2">

              {/* Voice mode UI */}
              {useVoiceMode ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <button
                    onClick={() => handleVoiceInput()}
                    className={`relative w-14 h-14 rounded-full transition-all flex items-center justify-center
                      ${isListening || isServerVoiceRecording
                        ? 'bg-saffron shadow-[0_0_28px_rgba(255,103,31,0.65)] scale-110 animate-pulse'
                        : isSpeaking
                        ? 'bg-green shadow-[0_0_28px_rgba(4,106,56,0.65)] scale-110 animate-pulse'
                        : isStreaming
                        ? 'bg-slate-100 animate-pulse'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    <Mic className="w-6 h-6 text-[#000080]" />
                  </button>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isListening || isServerVoiceRecording
                        ? 'text-saffron'
                        : isSpeaking
                          ? 'text-green'
                          : 'text-slate-400'
                    }`}
                  >
                    {isListening
                      ? 'Listening…'
                      : isServerVoiceRecording
                        ? 'Recording… tap again'
                        : isSpeaking
                          ? 'Speaking…'
                          : isStreaming
                            ? 'Thinking…'
                            : serverVoiceFallbackUi
                              ? 'Tap to record'
                              : 'Tap to speak'}
                  </span>
                  {!VOICE_FORCE_SERVER_STT &&
                    !VOICE_CHROME_SPEECH_ONLY &&
                    serverVoiceFallbackUi && (
                      <button
                        type="button"
                        onClick={() => {
                          speechNetworkBlockedRef.current = false;
                          setServerVoiceFallbackUi(false);
                          toast.message('Chrome Web Speech enabled again', {
                            description: 'Tap the mic — if VPN/firewall blocks Google, switch back or set Bhashini.',
                          });
                        }}
                        className="text-[9px] font-bold text-[#FF9933]/90 hover:text-[#FF9933] uppercase tracking-wider"
                      >
                        Use Chrome speech instead
                      </button>
                    )}
                </div>
              ) : (
                /* Text input — gold standard */
                <div className="flex items-end gap-2">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSelectedImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Attach + Image preview */}
                  {selectedImage ? (
                    <div className="relative w-10 h-10 shrink-0">
                      <img src={selectedImage} alt="Attached" className="w-full h-full object-cover rounded-lg border border-orange-100" />
                      <button onClick={() => setSelectedImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center shadow">
                        <X size={8} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-300 hover:text-saffron hover:bg-orange-50 rounded-lg transition-colors shrink-0"
                      title="Attach image"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}

                  {/* Text area + Optional Date Picker for Wizard */}
                  <div className="flex-1 space-y-2">
                    {(wizardStep === 'startDate' || wizardStep === 'endDate') && !isStreaming && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="relative flex-1 group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Calendar className="w-3.5 h-3.5 text-[#FF9933]" />
                          </div>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              if (e.target.value) sendMessage(e.target.value);
                            }}
                            className="w-full bg-[#FF9933]/5 border border-[#FF9933]/20 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-[#000080] outline-none focus:border-[#FF9933] focus:ring-1 focus:ring-[#FF9933]/20 transition-all cursor-pointer appearance-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-saffron/40 pointer-events-none uppercase tracking-tighter">Dropdown Calendar</span>
                        </div>
                      </div>
                    )}
                    
                    <textarea
                      id="yatra-ai-input"
                      ref={inputRef as any}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        // Auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && inputValue.trim() && !isStreaming) {
                          e.preventDefault();
                          sendMessage(inputValue);
                        }
                      }}
                      placeholder={
                        (wizardStep === 'startDate' || wizardStep === 'endDate') 
                          ? "Select date above or type here..." 
                          : "Message Assistant…"
                      }
                      disabled={isStreaming}
                      rows={1}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-[#000080] placeholder-slate-400 outline-none focus:border-saffron/30 transition-colors resize-none disabled:opacity-50 leading-relaxed"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>

                  {/* Send / Stop */}
                  {isStreaming ? (
                    <button
                      onClick={handleStop}
                      className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-orange-50 hover:text-saffron transition-all shrink-0"
                      title="Stop"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      id="yatra-ai-send-btn"
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isStreaming}
                      className="p-2.5 bg-saffron text-white rounded-2xl disabled:opacity-25 hover:brightness-110 active:scale-90 transition-all shrink-0 shadow-[0_4px_12px_rgba(255,103,31,0.3)]"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => { setUseVoiceMode(false); if (audioRef.current) audioRef.current.pause(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                      !useVoiceMode ? 'bg-white shadow-sm text-saffron' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Send className="w-2.5 h-2.5" /> Text
                  </button>
                  <button
                    onClick={() => {
                      if (!useVoiceMode) {
                        setUseVoiceMode(true);
                        setTimeout(() => handleVoiceInput(), 100);
                      } else {
                        handleVoiceInput();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      useVoiceMode ? 'bg-saffron text-white shadow-lg shadow-saffron/20' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Mic className="w-2.5 h-2.5" /> {useVoiceMode ? (isListening ? 'Stop' : 'Voice') : 'Voice'}
                  </button>
                </div>
                <span className="text-[8px] text-slate-400 select-none">Enter to send · Shift+Enter for newline</span>
              </div>
            </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB (when panel is closed) ── */}
      {!isPrimarySidebarOpen && (
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpen(true)}
              className="relative w-16 h-16 rounded-full flex items-center justify-center text-[#000080] shadow-[0_12px_40px_rgba(255,191,0,0.4)] border border-slate-200 group overflow-hidden bg-white"
            >
              {/* Siri Orb Gradient Mesh */}
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-accent-amber via-orange-500 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4)_0%,transparent_50%)]" />
              <div className="absolute inset-0 z-0 animate-pulse bg-[radial-gradient(circle_at_80%_80%,rgba(255,153,51,0.2)_0%,transparent_50%)]" />
              
              <Sparkles className="w-7 h-7 relative z-10 text-[#000080]" />
              
              {/* Pulse rings */}
              <div className="absolute inset-0 border-2 border-accent-amber/40 rounded-full animate-ping pointer-events-none" />
              <div className="absolute -inset-1 border border-slate-200 rounded-full blur-sm" />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      <style>{`
        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-cursor-blink { animation: cursor-blink 1s step-end infinite; }
      `}</style>
    </motion.div>
  );
}
