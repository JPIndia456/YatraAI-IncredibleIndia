'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Price Lock Timer
// Shows a live countdown for how long the displayed price
// is valid. Triggers a re-verification callback on expiry.
// ─────────────────────────────────────────────────────────
interface PriceLockTimerProps {
  lockDurationSeconds?: number; // default 10 minutes
  onExpire: () => void;
  className?: string;
}

export function PriceLockTimer({ lockDurationSeconds = 600, onExpire, className = '' }: PriceLockTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(lockDurationSeconds);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setHasExpired(true);
      onExpire();
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, onExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const ratio = secondsLeft / lockDurationSeconds;

  // Color transitions: green → amber → red
  const color = ratio > 0.4 ? 'text-emerald-400' : ratio > 0.15 ? 'text-amber-400' : 'text-red-400';
  const borderColor = ratio > 0.4 ? 'border-emerald-500/30' : ratio > 0.15 ? 'border-amber-500/30' : 'border-red-500/30 animate-pulse';
  const bgColor = ratio > 0.4 ? 'bg-emerald-500/5' : ratio > 0.15 ? 'bg-amber-500/5' : 'bg-red-500/10';

  if (hasExpired) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/40 rounded-xl ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <span className="text-[10px] font-bold text-red-400">Price expired — refreshing...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${bgColor} border ${borderColor} rounded-xl transition-all ${className}`}>
      <Timer className={`w-3.5 h-3.5 ${color} shrink-0`} />
      <span className={`text-[10px] font-bold ${color} tabular-nums`}>
        Price locked for{' '}
        <span className="font-black text-[11px]">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </span>
      {/* Progress bar */}
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden ml-1">
        <motion.div
          className={`h-full rounded-full ${ratio > 0.4 ? 'bg-emerald-500' : ratio > 0.15 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${ratio * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Price Change Alert Modal
// Shown when live price differs from displayed price.
// User must explicitly accept or reject before payment.
// ─────────────────────────────────────────────────────────
export interface PriceVerificationResult {
  displayedPrice: number;
  livePrice: number;
  changed: boolean;
  increased: boolean;
  priceDiff: number;
  priceDiffPercent: number;
  reason?: string;
  priceToken?: string;
}

interface PriceChangeAlertProps {
  result: PriceVerificationResult;
  onAccept: (verifiedPrice: number, priceToken?: string) => void;
  onReject: () => void;
}

export function PriceChangeAlert({ result, onAccept, onReject }: PriceChangeAlertProps) {
  const isIncrease = result.increased;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-7 max-w-sm w-full space-y-6 relative overflow-hidden"
        >
          {/* Decorative gradient blob */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-[2rem] ${isIncrease ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`} />

          {/* Icon */}
          <div className="text-center pt-2">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 
              ${isIncrease ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              {isIncrease
                ? <TrendingUp className="w-8 h-8 text-red-400" />
                : <TrendingDown className="w-8 h-8 text-emerald-400" />
              }
            </div>
            <h2 className="text-xl font-black text-white">
              {isIncrease ? 'Price Has Increased' : 'Price Dropped! 🎉'}
            </h2>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              {result.reason || (isIncrease
                ? 'Live carrier pricing is higher than what was displayed.'
                : 'Good news — the live price is lower than displayed!'
              )}
            </p>
          </div>

          {/* Price comparison */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500">Price you saw</span>
              <span className="text-sm font-bold text-zinc-400 line-through">
                ₹{result.displayedPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400 font-bold">Live price now</span>
              <span className={`text-xl font-black ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                ₹{result.livePrice.toLocaleString()}
              </span>
            </div>
            <div className={`flex items-center justify-between pt-2 border-t border-zinc-800`}>
              <span className="text-[10px] text-zinc-600">Difference</span>
              <span className={`text-xs font-black ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                {isIncrease ? '+' : '-'}₹{result.priceDiff.toLocaleString()} ({result.priceDiffPercent}%)
              </span>
            </div>
          </div>

          {/* Policy note */}
          <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
            Yatra shows real-time prices. Fares are set by carriers and are subject to availability. We never markup prices.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onAccept(result.livePrice, result.priceToken)}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95
                ${isIncrease
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-90'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90'
                }`}
            >
              {isIncrease
                ? `Accept & Pay ₹${result.livePrice.toLocaleString()}`
                : `Great! Pay ₹${result.livePrice.toLocaleString()}`
              }
            </button>
            <button
              onClick={onReject}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95"
            >
              Cancel Booking
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// Price Verifying Overlay
// Shown while the live price check is in-flight
// ─────────────────────────────────────────────────────────
export function PriceVerifyingOverlay() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
            <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-white">Verifying live price</p>
            <p className="text-[10px] text-zinc-500">Checking real-time availability...</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
