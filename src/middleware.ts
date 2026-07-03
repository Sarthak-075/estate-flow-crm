import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/leads'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);

            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const isOnboardingRoute = pathname.startsWith('/onboarding');

  // Authenticated users should not see auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If we have a session, fetch the user's profile org id only for protected or onboarding routes
  if (session && (isProtectedRoute || isOnboardingRoute)) {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    // If the user has no organization, force onboarding (unless already there)
    if (!profileErr && profile?.organization_id === null && !isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    // Prevent users with an organization from accessing onboarding
    if (!profileErr && profile?.organization_id !== null && isOnboardingRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If the user *has* an organization and is trying to hit an auth page, keep original redirect (handled above)
  }

  // Unauthenticated users cannot access protected pages
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip:
     * - _next static files
     * - images
     * - favicon
     * - common assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
