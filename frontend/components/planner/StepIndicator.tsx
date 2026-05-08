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
                    ? 'w-6 h-6 bg-green shadow-sm shadow-green/30 group-hover:scale-110'
                    : isActive
                    ? 'w-6 h-6 bg-saffron shadow-sm shadow-saffron/30'
                    : 'w-6 h-6 bg-slate-100 border border-slate-200'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 text-white" />
                ) : isActive ? (
                  <span className="w-2 h-2 bg-white rounded-full" />
                ) : null}
              </motion.div>
              <span className={`text-[13px] font-extrabold transition-colors block uppercase whitespace-nowrap ${
                isActive ? 'text-saffron' : isDone ? 'text-green' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-px mb-4 transition-colors ${isDone ? 'bg-green/40' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
