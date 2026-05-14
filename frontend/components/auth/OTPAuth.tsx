'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/** Browser-initiated Supabase OTP keeps PKCE state so email-link redirects can finish at /auth/callback. */
const SUPABASE_EMAIL_OTP_FROM_BROWSER =
  process.env.NEXT_PUBLIC_EMAIL_OTP_MODE?.trim().toLowerCase() === 'supabase';

export default function OTPAuth({ hideToggle = false }: { hideToggle?: boolean }) {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [method, setMethod] = useState<'email'>('email');
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpChannel, setOtpChannel] = useState<'supabase' | 'custom' | null>(null);
  /** Email path: 4 for Resend custom OTP, 6+ for Supabase-native (`EMAIL_OTP_MODE=supabase`). */
  const [emailOtpDigits, setEmailOtpDigits] = useState(4);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const remainingCooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const isOtpRequest = true;
  const isSendBlocked = loading || !value || (mounted && isOtpRequest && remainingCooldown > 0);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const handleInitialAction = async () => {
    if (loading) return;
    if (!value) return toast.error(t('enter_email'));
    if (isOtpRequest && remainingCooldown > 0) {
      return toast.error(t('auth_too_many_requests', { seconds: remainingCooldown }));
    }
    setLoading(true);

    try {
      if (SUPABASE_EMAIL_OTP_FROM_BROWSER) {
        const emailAddr = value.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({
          email: emailAddr,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/planner`,
          },
        });
        if (error) {
          throw new Error(error.message || t('auth_failed_send_otp'));
        }
        const cooldownSeconds = process.env.NODE_ENV === 'development' ? 10 : 60;
        setEmailOtpDigits(6);
        setOtpChannel('supabase');
        toast.success(t('auth_check_email'), {
          description: t('auth_check_email_desc'),
          duration: 10000,
        });
        setStep('verify');
        setCooldownUntil(Date.now() + cooldownSeconds * 1000);
      } else {
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'email', value, language }),
        });
        const result = await response.json();
        if (!response.ok) {
          const retrySec =
            typeof result.retryAfterSeconds === 'number' ? result.retryAfterSeconds : undefined;
          if (retrySec != null && retrySec > 0) {
            setCooldownUntil(Date.now() + retrySec * 1000);
          }
          throw new Error(result.error || t('auth_failed_send_otp'));
        }

        const digits =
          typeof result.otpDigits === 'number'
            ? Math.min(12, Math.max(4, result.otpDigits))
            : 4;
        setEmailOtpDigits(digits);
        setOtpChannel(result.otpChannel === 'custom' ? 'custom' : 'supabase');
        toast.success(result.message || t('auth_check_email'), {
          description: result.message
            ? 'Refer to the message above for instructions.'
            : digits === 4
              ? 'We sent a 4-digit verification code to your email.'
              : `Enter the ${digits}-digit code from your email.`,
          duration: 10000
        });
        setStep('verify');
        setCooldownUntil(Date.now() + (result.cooldownSeconds ?? 60) * 1000);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return toast.error(t('verify_otp'));

    setLoading(true);
    try {
      const normalized = value.trim().toLowerCase();

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: normalized,
          otp: otp.trim(),
          method: 'email',
          otpChannel,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t('invalid_otp'));

      await supabase.auth.getSession();

      toast.success(t('success_login'));
      // Full navigation so middleware sees session cookies (Route Handler Set-Cookie).
      window.location.assign('/planner');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('invalid_otp');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <AnimatePresence mode="wait">
        {step === 'input' ? (
          <motion.div
            key="input-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >

            <div className="space-y-3">
              <input
                type="email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all placeholder:text-zinc-500 font-medium"
              />

              <button
                onClick={handleInitialAction}
                disabled={isSendBlocked}
                className="w-full bg-zinc-900 hover:bg-orange-600 disabled:bg-zinc-100 disabled:text-zinc-400 px-6 py-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-zinc-900/10 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mounted && isOtpRequest && remainingCooldown > 0
                        ? t('auth_too_many_requests', { seconds: remainingCooldown })
                        : (mounted ? t('next') : 'Next')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="verify-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center space-y-2">
              <p className="text-xs text-zinc-700 uppercase tracking-widest font-bold">
                {mounted ? t('auth_code_sent_to') : 'Verification code sent to'}
              </p>
              <p className="text-cyan-500 font-medium">{value}</p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={emailOtpDigits}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder={emailOtpDigits === 6 ? '0 0 0 0 0 0' : '0 0 0 0'}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-5 text-zinc-900 text-center text-4xl sm:text-5xl tracking-[0.2em] sm:tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all shadow-xl"
            />

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setStep('input');
                  setOtp('');
                  setOtpChannel(null);
                }}
                className="flex-1 px-6 py-4 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 hover:bg-zinc-50 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{mounted ? t('back') : 'Back'}</span>
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="flex-[2] bg-zinc-900 px-6 py-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-zinc-900/10 hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{mounted ? t('next') : 'Next'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
