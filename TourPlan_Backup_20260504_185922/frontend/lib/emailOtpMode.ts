/**
 * Native Supabase email OTP (6-digit code). Must match server verify/send routes.
 *
 * For PKCE email links to work if someone clicks them, also set
 * NEXT_PUBLIC_EMAIL_OTP_MODE=supabase so signInWithOtp runs in the browser.
 */
export function isSupabaseNativeEmailOtpMode(): boolean {
  const pub = process.env.NEXT_PUBLIC_EMAIL_OTP_MODE?.trim().toLowerCase();
  if (pub === 'supabase') return true;
  const legacy = process.env.EMAIL_OTP_MODE?.trim().toLowerCase();
  return legacy === 'supabase';
}
