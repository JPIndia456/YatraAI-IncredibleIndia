'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Sparkles, History, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { INDIAN_TIER_CITIES } from '@/lib/data/destinations';

interface LocationSearchProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  icon?: any;
}

export default function LocationSearch({ placeholder, value, onChange, onEnter, icon: Icon = MapPin }: LocationSearchProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable reference — inline array in deps caused useEffect → setSuggestions → infinite re-renders.
  const allLocations = useMemo(
    (): Array<{ name: string; type: string; label: string; city?: string }> => [
      ...INDIAN_TIER_CITIES.tier1.map((c) => ({ name: c, type: 'CITY', label: t('tier1_city') })),
      ...INDIAN_TIER_CITIES.tier2.map((c) => ({ name: c, type: 'CITY', label: t('tier2_city') })),
      ...INDIAN_TIER_CITIES.tier3.map((c) => ({ name: c, type: 'CITY', label: t('tier3_city') })),
      ...INDIAN_TIER_CITIES.famousDestinations.map((d) => ({
        name: d.name,
        type: 'DESTINATION',
        label: `${d.type} ${t('heritage')}`,
        city: d.city,
      })),
    ],
    [t],
  );

  // Keep local input in sync when parent resets/updates value.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) {
      // Show popular defaults on focus for a clean discoverable UX.
      setSuggestions(allLocations.slice(0, 6));
      return;
    }

    const filtered = allLocations
      .filter(loc => {
        const name = loc.name.toLowerCase();
        const city = String(loc.city || '').toLowerCase();
        return name.includes(trimmed) || city.includes(trimmed);
      })
      .slice(0, 6);
    setSuggestions(filtered);
  }, [query, allLocations]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeLocation = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return '';
    const canonical = allLocations.find(
      (loc) => loc.name.toLowerCase() === cleaned.toLowerCase()
    );
    return canonical ? canonical.name : cleaned;
  };

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setIsOpen(false);
    onEnter?.();
  };

  return (
    <div className={`relative flex-1 ${isOpen ? 'z-[120]' : 'z-0'}`} ref={containerRef}>
      <div className="relative group">
        <Icon className={`absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isOpen ? 'text-cyan-500' : 'text-zinc-600 group-focus-within:text-cyan-500'}`} />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const normalized = normalizeLocation(query);
              setQuery(normalized);
              onChange(normalized);
              setIsOpen(false);
              onEnter?.();
            }
          }}
          onBlur={() => {
            const normalized = normalizeLocation(query);
            if (normalized !== query) {
              setQuery(normalized);
              onChange(normalized);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onChange(e.target.value);
          }}
          className={`w-full bg-white border pl-12 pr-6 py-3.5 rounded-xl text-xs placeholder-zinc-400 outline-none transition-all font-bold text-[#000080]
            ${isOpen ? 'border-blue-500/40 ring-4 ring-blue-500/5' : 'border-zinc-200 focus:border-blue-500/50'}`}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); onChange(''); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full text-zinc-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 z-[220] bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-xl shadow-[0_14px_32px_rgba(0,0,0,0.1)] overflow-hidden"
          >
            <div className="p-2">
              <div className="px-4 py-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('suggestions')}</span>
              </div>
              
              {suggestions.map((loc, i) => (
                <button
                  key={`${loc.name}-${i}`}
                  onClick={() => handleSelect(loc.name)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-blue-500/30 transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#000080] group-hover:text-[#00008B]">{loc.name}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">{loc.label} {loc.city ? `• ${loc.city}` : ''}</p>
                    </div>
                  </div>
                  <History className="w-3.5 h-3.5 text-zinc-800 group-hover:text-zinc-600" />
                </button>
              ))}
            </div>
            <div className="bg-zinc-900/40 p-3 text-center border-t border-white/5">
              <p className="text-[9px] text-zinc-600 font-medium">{t('powered_by')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
