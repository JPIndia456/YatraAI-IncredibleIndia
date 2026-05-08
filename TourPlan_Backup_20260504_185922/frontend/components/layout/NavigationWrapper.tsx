'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useAIBrainStore } from '@/lib/store';

interface NavigationWrapperProps {
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  showHome?: boolean;
}

export default function NavigationWrapper({ 
  children, 
  onNext, 
  onBack, 
  nextLabel, 
  backLabel,
  showHome = false
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
        className={`fixed bottom-0 left-0 z-50 p-2.5 sm:p-3 md:p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent transition-all duration-500 no-print ${isPrimarySidebarOpen ? 'lg:right-[400px]' : isAIBrainOpen ? 'right-0 lg:right-[480px]' : 'right-0'}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex-1 max-w-[132px] md:max-w-[146px] bg-gradient-to-r from-cyan-500 via-white to-green-600 px-3.5 md:px-5 py-2.5 md:py-3 rounded-xl text-zinc-950 font-black text-xs md:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/10 transition-all"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{backLabel || t('back')}</span>
          </motion.button>

          {showHome && (
            <motion.button
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/planner')}
              className="p-3 md:p-4 rounded-full bg-zinc-900 border border-zinc-800 text-cyan-500 shadow-lg"
            >
              <Home className="w-5 h-5" />
            </motion.button>
          )}

          {onNext && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNext}
              className="flex-1 max-w-[182px] md:max-w-[194px] bg-gradient-to-r from-cyan-500 via-white to-green-600 px-4.5 md:px-7 py-2.5 md:py-3 rounded-xl text-zinc-950 font-black text-xs md:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/10 transition-all"
            >
              <span>{nextLabel || t('next')}</span>
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
