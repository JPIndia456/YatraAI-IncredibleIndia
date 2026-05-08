import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createHash, timingSafeEqual } from 'crypto';
import { getAdminClient, hasServiceKey } from '@/lib/supabaseAdmin';
import { consumePersistentAuthLimit } from '@/lib/security/authRateLimit';

type VerifyRateEntry = { count: number; resetAt: number };
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 10;
const verifyRateStore = new Map<string, VerifyRateEntry>();

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function clientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  return xff ? xff.split(',')[0].trim() : 'unknown';
}

function checkVerifyLimit(key: string, now: number) {
  const existing = verifyRateStore.get(key);
  if (!existing || now > existing.resetAt) {
    verifyRateStore.set(key, { count: 1, resetAt: now + VERIFY_WINDOW_MS });
    return { ok: true, retryAfterMs: 0 };
  }
  if (existing.count >= VERIFY_MAX_ATTEMPTS) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  verifyRateStore.set(key, existing);
  return { ok: true, retryAfterMs: 0 };
}

function normalizeEmailTarget(raw: string) {
  return String(raw).trim().toLowerCase();
}

function normalizePhoneTarget(raw: string) {
  const t = String(raw).trim().replace(/\s+/g, '');
  return t.startsWith('+') ? t : `+91${t}`;
}

function otpMatches(stored: string, provided: string): boolean {
  const a = Buffer.from(stored.trim(), 'utf8');
  const b = Buffer.from(provided.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function hashOtp(target: string, otp: string) {
  return createHash('sha256').update(`${target}:${otp}`).digest('hex');
}

/** Supabase SSR: session cookies must be written onto this response (not `cookies()` alone). */
function createRouteHandlerSupabase(req: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, otp, method, otpChannel } = (await req.json()) as {
      email?: string;
      otp?: string;
      method?: string;
      otpChannel?: string | null;
    };

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing email or security code' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const isPhone = method === 'phone';
    const target = isPhone ? normalizePhoneTarget(email) : normalizeEmailTarget(email);
    const now = Date.now();
    const rateKey = `${clientIp(req)}:${method}:${target}`;
    const persistentLimit = await consumePersistentAuthLimit(
      `verify:${rateKey}`,
      VERIFY_MAX_ATTEMPTS,
      VERIFY_WINDOW_MS
    );
    const limit = persistentLimit ?? checkVerifyLimit(rateKey, now);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many verification attempts', retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000) },
        { status: 429 },
      );
    }

    // Phone: SMS OTP — bind session cookies to the JSON response.
    if (isPhone) {
      const res = NextResponse.json({ ok: true });
      const supabase = createRouteHandlerSupabase(req, res);
      const { error } = await supabase.auth.verifyOtp({
        phone: target,
        token: String(otp).trim(),
        type: 'sms',
      });
      if (error) {
        return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 401 });
      }
      return res;
    }

    const providedOtp = String(otp).trim();

    // Email: Supabase-native OTP (browser or API send path).
    if (otpChannel === 'supabase') {
      const res = NextResponse.json({ ok: true });
      const supabase = createRouteHandlerSupabase(req, res);
      const { error } = await supabase.auth.verifyOtp({
        email: target,
        token: providedOtp,
        type: 'email',
      });
      if (error) {
        return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 401 });
      }
      return res;
    }

    // Email: custom numeric OTP, then session on same response object.
    if (!hasServiceKey) {
      return NextResponse.json({ error: 'Server is not configured for email OTP verification.' }, { status: 500 });
    }

    const admin = getAdminClient();
    const { data: row, error: selErr } = await admin
      .from('email_otps')
      .select('id, otp')
      .eq('email', target)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const hashedProvidedOtp = hashOtp(target, providedOtp);
    const legacyMatch = row ? otpMatches(String(row.otp), providedOtp) : false;
    const hashMatch = row ? otpMatches(String(row.otp), hashedProvidedOtp) : false;

    if (selErr || !row || (!legacyMatch && !hashMatch)) {
      return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 401 });
    }

    await admin.from('email_otps').update({ is_used: true }).eq('id', row.id);

    let linkData = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: target,
    });

    if (linkData.error) {
      const msg = linkData.error.message?.toLowerCase() ?? '';
      const maybeMissingUser =
        msg.includes('not found') || msg.includes('no user') || msg.includes('user not found');
      if (maybeMissingUser) {
        const { error: createErr } = await admin.auth.admin.createUser({
          email: target,
          email_confirm: true,
        });
        if (createErr && !createErr.message?.toLowerCase().includes('already')) {
          console.error('[verify-otp] createUser:', createErr.message);
          return NextResponse.json({ error: 'Could not complete sign-in. Try again.' }, { status: 500 });
        }
        linkData = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: target,
        });
      }
    }

    if (linkData.error || !linkData.data?.properties?.hashed_token) {
      console.error('[verify-otp] generateLink:', linkData.error?.message);
      return NextResponse.json({ error: 'Could not complete sign-in. Try again.' }, { status: 500 });
    }

    const tokenHash = linkData.data.properties.hashed_token;
    const res = NextResponse.json({ ok: true });
    const supabase = createRouteHandlerSupabase(req, res);
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    });

    if (verifyErr) {
      return NextResponse.json({ error: 'Invalid or expired security code' }, { status: 401 });
    }

    return res;
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, 'Verification failed') }, { status: 500 });
  }
}
