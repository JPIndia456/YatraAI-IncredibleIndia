'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { Check, Globe, ChevronRight } from 'lucide-react';

interface LanguageSelectorProps {
  onProceed?: () => void;
  variant?: 'full' | 'dropdown';
}

export default function LanguageSelector({ onProceed, variant = 'full' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = (code: string) => {
    setLanguage(code);
  };

  if (variant === 'dropdown') {
    return (
      <select
        value={language}
        onChange={(e) => handleSelect(e.target.value)}
        className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer max-w-[90px]"
        style={{ colorScheme: 'dark' }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
            {lang.native} — {lang.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-2xl mx-auto aurora-bg p-4 rounded-3xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <motion.button
              key={lang.code}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(lang.code)}
              className={`relative p-6 rounded-3xl border transition-all duration-500 overflow-hidden flex flex-col items-center justify-center space-y-3 text-center ${
                isSelected 
                  ? 'bg-zinc-900/60 border-cyan-500 shadow-[0_0_40px_rgba(255,153,51,0.25)] border-glow' 
                  : 'bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-500/50 backdrop-blur-md'
              }`}
            >
              {isSelected && (
                <motion.div 
                  layoutId="active-lang-aura"
                  className="absolute inset-0 bg-cyan-500/5 animate-pulse"
                />
              )}
              {isSelected && (
                <motion.div 
                  layoutId="active-lang"
                  className="absolute top-2 right-2 text-cyan-500"
                >
                  <Check className="w-4 h-4" />
                </motion.div>
              )}
              <span className={`text-xl font-bold ${isSelected ? 'text-cyan-500' : 'text-zinc-300'}`}>
                {lang.native}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                {lang.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {onProceed && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onProceed}
          className="w-full mt-8 bg-gradient-to-r from-cyan-500 via-white/90 to-green-600 p-4 rounded-xl flex items-center justify-center space-x-2 shadow-xl hover:shadow-cyan-500/20 transition-all group"
        >
          <span className="text-zinc-900 font-black uppercase tracking-[0.2em]">
            {t('continue')}
          </span>
          <ChevronRight className="w-5 h-5 text-zinc-900 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      )}
    </div>
  );
}
