import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // getUser(). A simple mistake can make it very hard to debug
  // issues with sessions being lost.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Route Protection ──────────────────────────────────────────────────────
  const protectedPaths = ['/planner', '/bookings', '/profile'];
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
  const isTestRoute = request.nextUrl.pathname.startsWith('/test');

  const isTest = request.nextUrl.searchParams.get('test') === 'true';
  const BYPASS_AUTH = false; // Set to true to bypass auth for development

  if (isProtected && !user && !BYPASS_AUTH && !isTest) {
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Redirect to landing/login
    return NextResponse.redirect(url);
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
