'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

type Step = { id: string; label: string };

interface StepIndicatorProps {
  steps: Step[];
  current: string;
  done: string[];
  onStepClick?: (stepId: string) => void;
}

export default function StepIndicator({ steps, current, done, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {steps.map((step, i) => {
        const isDone = done.includes(step.id);
        const isActive = step.id === current;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <button 
              onClick={() => onStepClick?.(step.id)}
              disabled={!onStepClick || (!isDone && !isActive)}
              className="flex flex-col items-center gap-1 group outline-none"
            >
              <motion.div
                layout
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                  isDone
                    ? 'w-6 h-6 bg-blue-600 shadow-sm shadow-blue-600/30 group-hover:scale-110'
                    : isActive
                    ? 'w-6 h-6 bg-blue-600 shadow-sm shadow-blue-600/30'
                    : 'w-5 h-5 bg-white/8 border border-white/12'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 text-[#003366]" />
                ) : isActive ? (
                  <span className="w-2 h-2 bg-white rounded-full" />
                ) : null}
              </motion.div>
              <span className={`text-[9px] md:text-11 font-bold transition-colors hidden sm:block uppercase tracking-wider ${
                isActive ? 'text-blue-600' : isDone ? 'text-blue-600' : 'text-zinc-600'
              }`}>
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-px mb-4 transition-colors ${isDone ? 'bg-blue-600/40' : 'bg-white/8'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
