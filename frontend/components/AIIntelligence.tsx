'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Castle, Users, Train, Moon, Trees, 
  Sparkles, Loader2, Navigation, PartyPopper,
  Info, MapPin, Search
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIIntelligence({ category, location }: { category: string, location: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (!location || location.trim().length < 3) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/mcp/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, stateLocation: location, language })
        });
        
        const rawText = await res.text();
        try {
          if (rawText.startsWith('<!DOCTYPE html>')) {
             throw new Error("Server returned HTML instead of JSON. Check backend connectivity.");
          }
          const result = JSON.parse(rawText);
          if (result.success) {
            setData(result.data);
          } else {
            console.warn("AI Intelligence Fallback:", result.error);
          }
        } catch (jsonErr: any) {
          console.error("Intelligence Parse Error:", jsonErr.message);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 1200); // 1.2s Debounce to prevent API spam while typing

    return () => clearTimeout(timer);
  }, [category, location, language]);

  if (loading || !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-zinc-500 gap-4 min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="font-medium tracking-widest uppercase text-xs">Yatra Brain Architecture Running...</span>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'culinary', title: 'Local Food & Culinary Scenes', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { id: 'heritage', title: 'Historical & Cultural Landmarks', icon: Castle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'vibe', title: 'Neighborhood Vibe & Street Life', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { id: 'transport', title: 'Local Transportation (City Nervous System)', icon: Train, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { id: 'night', title: 'Night Scenes & Illumination', icon: Moon, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { id: 'nature', title: 'Natural Vibe & Scenery', icon: Trees, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pt-16 max-w-7xl mx-auto space-y-12"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Deep AI Intelligence</span>
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">
          Curated Suggestions for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-400 capitalize">{location}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <motion.div 
            key={section.id}
            whileHover={{ y: -5 }}
            className={`glass-panel p-8 space-y-6 ${section.bg} transition-all duration-300 group`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${section.color} bg-white/5 border border-white/10 group-hover:scale-110 transition-transform`}>
                <section.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold leading-tight">{section.title}</h3>
            </div>

            <div className="space-y-4">
              {data[section.id]?.map((item: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${section.color}`} />
                    <span className="font-bold text-sm text-zinc-100">{item.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed pl-3.5">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <button className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Explore More <Navigation className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
