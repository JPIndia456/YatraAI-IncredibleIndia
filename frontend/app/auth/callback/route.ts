import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';

/**
 * Auth callback: magic link, OAuth PKCE, or email confirmation redirects here.
 * Session cookies must be attached to the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/planner';
  const safeNext = next.startsWith('/') ? next : '/planner';

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin;

  const successUrl = `${origin}${safeNext}`;

  const failToHome = (detail: string) => {
    const q = new URLSearchParams({
      error: 'auth_failed',
      message: detail,
    });
    return NextResponse.redirect(`${origin}/?${q.toString()}`);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return failToHome(
      'Sign-in service is not configured (missing Supabase URL or anon key on the server).',
    );
  }

  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.redirect(successUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error('[Auth Callback] Code exchange error:', error.message);
    return failToHome(
      'Email link sign-in did not finish (often PKCE/session mismatch). Enter the verification code from your email on the home page instead.',
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return response;
    }
    console.error('[Auth Callback] OTP verification error:', error.message);
    return failToHome(
      'That email link is invalid or expired. Request a new code and enter it on the home page.',
    );
  }

  return failToHome(
    'Missing sign-in parameters from this link. Go back to the home page and enter the verification code from your email.',
  );
}
