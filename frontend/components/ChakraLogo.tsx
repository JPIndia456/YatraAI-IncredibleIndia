'use client';

import { motion } from 'framer-motion';

export default function ChakraLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className={`relative ${className} drop-shadow-[0_0_8px_rgba(255,153,51,0.4)] will-change-transform`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-500 fill-current">
        {/* Outer Heritage Circle */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30" />
        
        {/* Ashoka Chakra Spokes (24) */}
        {[...Array(24)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={50 + 40 * Math.cos((i * 15 * Math.PI) / 180)}
            y2={50 + 40 * Math.sin((i * 15 * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}

        {/* Decorative Heritage Dots */}
        {[...Array(24)].map((_, i) => (
          <circle
            key={`dot-${i}`}
            cx={50 + 42 * Math.cos((i * 15 * Math.PI) / 180)}
            cy={50 + 42 * Math.sin((i * 15 * Math.PI) / 180)}
            r="1.2"
            fill="currentColor"
            className="text-navy"
          />
        ))}

        {/* Central Bindu */}
        <circle cx="50" cy="50" r="6" fill="currentColor" />
        <circle cx="50" cy="50" r="2" fill="white" className="animate-pulse" />
      </svg>
    </motion.div>
  );
}
