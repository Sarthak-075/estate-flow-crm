import type { User } from "@supabase/supabase-js";

import { UnauthorizedError } from "./errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a server-side Supabase client.
 */
export async function getSupabase() {
  return await createClient();
}

/**
 * Returns the current authenticated session.
 */
export async function getSession() {
  const supabase = await getSupabase();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

/**
 * Returns the current user if authenticated.
 * Returns null otherwise.
 */
export async function optionalUser(): Promise<User | null> {
  const supabase = await getSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

/**
 * Returns the authenticated user.
 * Throws UnauthorizedError if not authenticated.
 */
export async function requireUser(): Promise<User> {
  const user = await optionalUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
