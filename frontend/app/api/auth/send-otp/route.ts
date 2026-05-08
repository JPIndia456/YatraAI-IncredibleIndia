import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomInt, createHash } from 'crypto';
import { getAdminClient, hasServiceKey } from '@/lib/supabaseAdmin';
import { consumePersistentAuthLimit } from '@/lib/security/authRateLimit';
import { isSupabaseNativeEmailOtpMode } from '@/lib/emailOtpMode';

type SendOtpPayload = {
  method: 'email' | 'phone';
  value: string;
  language?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const COOLDOWN_MS = 60 * 1000;

const rateLimitStore = new Map<string, RateLimitEntry>();
const cooldownStore = new Map<string, number>();

function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

function normalizeTarget(method: 'email' | 'phone', value: string) {
  if (method === 'email') return value.trim().toLowerCase();
  const digits = value.replace(/\s+/g, '');
  return digits.startsWith('+') ? digits : `+91${digits}`;
}

function checkRateLimit(key: string, now: number) {
  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterMs: 0 };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { ok: true, retryAfterMs: 0 };
}

function checkCooldown(key: string, now: number) {
  const cooldownUntil = cooldownStore.get(key) ?? 0;
  if (cooldownUntil > now) {
    return { ok: false, retryAfterMs: cooldownUntil - now };
  }
  cooldownStore.set(key, now + COOLDOWN_MS);
  return { ok: true, retryAfterMs: 0 };
}

function cleanupStores(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
  for (const [key, cooldownUntil] of cooldownStore.entries()) {
    if (cooldownUntil <= now) cooldownStore.delete(key);
  }
}

/** 6-digit numeric OTP. */
function generateNumericOtp(): string {
  return String(100000 + randomInt(900000));
}

function hashOtp(target: string, otp: string) {
  return createHash('sha256').update(`${target}:${otp}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendOtpPayload;
    const method = body?.method;
    const value = body?.value?.trim();

    if (!method || !value || (method !== 'email' && method !== 'phone')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const now = Date.now();
    cleanupStores(now);

    const target = normalizeTarget(method, value);
    const ip = getClientIp(req);
    const actorKey = `${ip}:${method}:${target}`;
    const ipKey = `${ip}:all`;

    const persistentCooldown = await consumePersistentAuthLimit(
      `cooldown:${actorKey}`,
      1_000_000,
      WINDOW_MS,
      COOLDOWN_MS
    );
    const cooldownResult = persistentCooldown ?? checkCooldown(actorKey, now);
    if (!cooldownResult.ok) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before requesting another code.',
          retryAfterSeconds: Math.ceil(cooldownResult.retryAfterMs / 1000),
        },
        { status: 429 },
      );
    }

    const persistentActorRate = await consumePersistentAuthLimit(
      `actor:${actorKey}`,
      MAX_REQUESTS_PER_WINDOW,
      WINDOW_MS
    );
    const actorRate = persistentActorRate ?? checkRateLimit(actorKey, now);
    if (!actorRate.ok) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for this account. Try again later.',
          retryAfterSeconds: Math.ceil(actorRate.retryAfterMs / 1000),
        },
        { status: 429 },
      );
    }

    const persistentIpRate = await consumePersistentAuthLimit(
      `ip:${ipKey}`,
      MAX_REQUESTS_PER_WINDOW * 3,
      WINDOW_MS
    );
    const ipRate = persistentIpRate ?? checkRateLimit(ipKey, now);
    if (!ipRate.ok) {
      return NextResponse.json(
        {
          error: 'Too many auth attempts from this network. Try again later.',
          retryAfterSeconds: Math.ceil(ipRate.retryAfterMs / 1000),
        },
        { status: 429 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase infrastructure is not fully configured' }, { status: 500 });
    }

    // Phone: SMS OTP only via Supabase (requires Twilio/MessageBird in project).
    if (method === 'phone') {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.auth.signInWithOtp({
        phone: target,
        options: { channel: 'sms' },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        message: 'We sent a verification code to your phone via SMS.',
        cooldownSeconds: Math.ceil(COOLDOWN_MS / 1000),
      });
    }

    // Email: Supabase-native OTP (when `EMAIL_OTP_MODE` / `NEXT_PUBLIC_EMAIL_OTP_MODE` = supabase
    // and the client uses the API instead of `signInWithOtp` in the browser).
    if (isSupabaseNativeEmailOtpMode()) {
      const siteOrigin =
        req.headers.get('origin')?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
        'http://localhost:3000';
      const emailRedirectTo = `${siteOrigin.replace(/\/$/, '')}/auth/callback?next=/planner`;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: {
          shouldCreateUser: true,
          emailRedirectTo,
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        message: 'We sent a verification code to your email.',
        cooldownSeconds: Math.ceil(COOLDOWN_MS / 1000),
        otpDigits: 6,
        otpChannel: 'supabase',
      });
    }

    // Email: numeric OTP only (no magic link). Stored in email_otps, delivered via Resend.
    if (!hasServiceKey) {
      return NextResponse.json(
        { error: 'Email OTP requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
        { status: 500 },
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey.startsWith('REPLACE_')) {
      return NextResponse.json(
        { error: 'Email OTP requires RESEND_API_KEY to be configured.' },
        { status: 500 },
      );
    }

    const otp = generateNumericOtp();
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();
    const otpHash = hashOtp(target, otp);

    const admin = getAdminClient();
    const { error: dbError } = await admin.from('email_otps').insert({
      email: target,
      otp: otpHash,
      expires_at: expiresAt,
      is_used: false,
    });

    if (dbError) {
      console.error('[send-otp] email_otps insert:', dbError.message);
      return NextResponse.json({ error: 'Failed to create verification code. Try again later.' }, { status: 500 });
    }

    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || 'Yatra <onboarding@resend.dev>';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [target],
        subject: 'Your Yatra verification code',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #0f172a;">
            <p style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Verification code</p>
            <p style="font-size: 40px; font-weight: 800; letter-spacing: 0.25em; margin: 16px 0;">${otp}</p>
            <p style="font-size: 13px; color: #64748b;">This code expires in 5 minutes. Do not share it with anyone.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = (await emailRes.json().catch(() => ({}))) as { message?: string };
      console.error('[send-otp] Resend error:', errBody);
      return NextResponse.json(
        { error: errBody.message || 'Email delivery failed. Check RESEND_FROM_EMAIL and domain verification.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'We emailed you a 6-digit verification code.',
      cooldownSeconds: Math.ceil(COOLDOWN_MS / 1000),
      otpDigits: 6,
      otpChannel: 'custom',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: errorMessage(error, 'Failed to send OTP') },
      { status: 500 },
    );
  }
}
