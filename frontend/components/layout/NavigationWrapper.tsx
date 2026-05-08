'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home, Sparkles } from 'lucide-react';
import { useAIBrainStore } from '@/lib/store';

interface NavigationWrapperProps {
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  showHome?: boolean;
  disabledNext?: boolean;
}

export default function NavigationWrapper({ 
  children, 
  onNext, 
  onBack, 
  nextLabel, 
  backLabel,
  showHome = false,
  disabledNext = false
}: NavigationWrapperProps) {
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const { isOpen: isAIBrainOpen, isPrimarySidebarOpen } = useAIBrainStore();

  const getPaddingClass = () => {
    if (isPrimarySidebarOpen) return 'lg:pr-[400px]';
    if (isAIBrainOpen) return 'lg:pr-[480px]';
    return '';
  };

  return (
    <div className={`flex flex-col min-h-screen transition-all duration-500 ${getPaddingClass()}`}>
      <div className="flex-1 pb-8 sm:pb-12 md:pb-16">
        {children}
      </div>

      {/* Persistent Navigation Bar */}
      <footer 
        className={`fixed bottom-0 left-0 z-50 p-2.5 sm:p-3 md:p-4 bg-white/80 backdrop-blur-xl border-t border-orange-100 transition-all duration-500 no-print ${isPrimarySidebarOpen ? 'lg:right-[400px]' : isAIBrainOpen ? 'right-0 lg:right-[480px]' : 'right-0'}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex-1 max-w-[132px] md:max-w-[146px] bg-[#046A38] px-3.5 md:px-5 py-2.5 md:py-3 rounded-xl text-white font-black text-xs md:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-green/20 transition-all hover:bg-[#03522b] active:scale-95"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="uppercase tracking-widest">{backLabel || t('back')}</span>
          </motion.button>

          {showHome && (
            <motion.button
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/planner')}
              className="p-3 md:p-4 rounded-full bg-orange-50 border border-orange-100 text-saffron shadow-lg"
            >
              <Home className="w-5 h-5" />
            </motion.button>
          )}

          {onNext && (
            <motion.button
              whileHover={disabledNext ? {} : { scale: 1.05 }}
              whileTap={disabledNext ? {} : { scale: 0.95 }}
              onClick={onNext}
              disabled={disabledNext}
              className={`flex-1 max-w-[260px] md:max-w-[280px] bg-[#FF671F] px-4.5 md:px-7 py-3 md:py-4 rounded-2xl text-white font-black text-xs md:text-sm flex items-center justify-center space-x-2 shadow-xl shadow-saffron/30 transition-all ${disabledNext ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-orange-600'}`}
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span className="uppercase tracking-[0.12em]">{nextLabel || t('next')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </motion.button>
          )}
        </div>
        
        {/* Safe area padding for mobile */}
        <div className="h-safe" />
      </footer>
    </div>
  );
}
