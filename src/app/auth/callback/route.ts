import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase auth callback handler.
 * Extracts the tokens from the query string, establishes a server‑side session,
 * then redirects the user to the dashboard (or landing page).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  const supabase = await createClient();

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  // Redirect to the dashboard after establishing the session.
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
