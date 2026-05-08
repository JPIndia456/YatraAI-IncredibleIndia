'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Cookie, ChevronRight } from 'lucide-react';

type ConsentLevel = 'all' | 'essential' | null;

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show only if user hasn't consented yet (DPDP Act 2023 — consent must be free, informed, specific)
    const existing = localStorage.getItem('tourplan_cookie_consent');
    if (!existing) {
      // Small delay so it doesn't pop over the page load
      setTimeout(() => setShow(true), 1800);
    }
  }, []);

  const handleConsent = (level: ConsentLevel) => {
    localStorage.setItem('tourplan_cookie_consent', JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      version: '1.0',  // Bump when policy changes to re-ask
    }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] w-full max-w-2xl px-4"
      >
        <div className="bg-zinc-900/98 border border-zinc-700 rounded-[1.75rem] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-3xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600/15 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Cookie & Data Notice</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Under DPDP Act, 2023 &amp; IT (SPDI) Rules, 2011
                </p>
              </div>
            </div>
            <button
              onClick={() => handleConsent('essential')}
              className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
            TourPlan collects only the data necessary to provide our AI-powered travel services —
            authentication credentials, booking preferences, and session data. We do{' '}
            <strong className="text-white">not</strong> sell, share, or monetise your personal information.
            {' '}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              {showDetails ? 'Hide details' : 'Learn more'}
              <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>
          </p>

          {/* Expandable detail */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-zinc-500">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="font-black text-zinc-300 mb-1">✅ Essential</p>
                    <p>Auth session, security tokens, booking state. Always active. Cannot be disabled.</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="font-black text-zinc-300 mb-1">📊 Analytics</p>
                    <p>Anonymous usage data (no PII). Helps improve trip accuracy. Opt-in only.</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="font-black text-zinc-300 mb-1">🤖 AI Personalisation</p>
                    <p>Stores trip preferences locally to improve AI advice. Opt-in only.</p>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 leading-relaxed">
                  Your rights under the DPDP Act, 2023: access, correction, erasure, and grievance redressal.
                  Contact our Grievance Officer at{' '}
                  <a href="mailto:grievance@yatraai.in" className="text-blue-500 hover:underline">
                    grievance@yatraai.in
                  </a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={() => handleConsent('essential')}
              className="flex-1 py-3 rounded-2xl text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-all active:scale-95"
            >
              Essential Only
            </button>
            <button
              onClick={() => handleConsent('all')}
              className="flex-1 py-3 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95 shadow-[0_6px_20px_rgba(37,99,235,0.3)]"
            >
              Accept All & Continue
            </button>
          </div>

          <p className="text-[9px] text-zinc-700 text-center mt-3">
            By using TourPlan you agree to our{' '}
            <a href="/legal?tab=privacy" className="text-zinc-500 hover:text-zinc-400">Privacy Policy</a>
            {' '}·{' '}
            <a href="/legal?tab=terms" className="text-zinc-500 hover:text-zinc-400">Terms of Service</a>
            {' '}·{' '}
            <a href="/legal?tab=disclaimer" className="text-zinc-500 hover:text-zinc-400">Disclaimer</a>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
