'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function StepPlanning() {
  return (
    <motion.div
      key="step-planning"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="py-8 sm:py-16 flex flex-col items-center gap-4 sm:gap-8"
    >
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />
        <div className="absolute inset-3 border-b-2 border-blue-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-[#003366]/60 animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <p className="text-base font-semibold text-[#003366]">Discovering options…</p>
        <p className="text-caption">Grounding real-time travel costs for your journey</p>
      </div>

      {/* Skeleton cards */}
      <div className="w-full space-y-4 max-w-lg">
        {[1, 2].map(i => (
          <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-4 w-24 bg-white/8 rounded" />
                <div className="h-4 w-16 bg-white/5 rounded ml-auto" />
              </div>
              <div className="h-6 w-48 bg-white/10 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="grid grid-cols-4 gap-2">
                {[1,2,3,4].map(j => <div key={j} className="h-16 bg-white/5 rounded-xl" />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
