import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedPaths = ['/planner', '/bookings', '/profile']

/**
 * Cost-sensitive API routes that should only be used by signed-in users.
 * Enforced centrally only when ENFORCE_API_AUTH=true so it can be enabled and
 * verified without risking a surprise breakage of any pre-login flow.
 */
const protectedApiPrefixes = [
  '/api/ai-brain',
  '/api/itinerary',
  '/api/discovery',
  '/api/search',
  '/api/live/',
  '/api/mcp/',
  '/api/voice/',
  '/api/planner/',
]

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname.startsWith(path))
}

function isProtectedApiPath(pathname: string) {
  return protectedApiPrefixes.some((path) => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isTestRoute = pathname.startsWith('/test')
  const isTest = request.nextUrl.searchParams.get('test') === 'true'
  const BYPASS_AUTH = false

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  /** Missing env: avoid crashing middleware; treat as signed-out (protected routes → home). */
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(pathname) && !BYPASS_AUTH && !isTest) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    if (isTestRoute && process.env.NODE_ENV === 'production') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Keep getUser immediately after createServerClient (Supabase SSR cookie contract).
  let user = null
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    user = u ?? null
  } catch {
    user = null
  }

  // ── Route Protection ──────────────────────────────────────────────────────
  const isProtected = isProtectedPath(pathname)

  if (isProtected && !user && !BYPASS_AUTH && !isTest) {
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Redirect to landing/login
    return NextResponse.redirect(url);
  }

  // Optional: gate cost-sensitive API routes behind a session. Enable by
  // setting ENFORCE_API_AUTH=true once you've confirmed every caller runs
  // in an authenticated context.
  if (
    process.env.ENFORCE_API_AUTH === 'true' &&
    isProtectedApiPath(pathname) &&
    !user &&
    !BYPASS_AUTH &&
    !isTest
  ) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  if (isTestRoute && process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this matcher to fit your needs.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
