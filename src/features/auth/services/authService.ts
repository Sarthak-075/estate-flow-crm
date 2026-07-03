import { createClient } from '@/lib/supabase/server';
import type { AuthActionResult } from '@/features/auth/types';

/**
 * Authentication service using Supabase server client.
 * All functions return a uniform {@link AuthActionResult}.
 */
export async function signUp(email: string, password: string): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signIn(email: string, password: string): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signOut(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function sendPasswordReset(email: string): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updatePassword(
  accessToken: string,
  refreshToken: string,
  newPassword: string
): Promise<AuthActionResult> {
  const supabase = await createClient();
  // Establish session from the reset link tokens
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionErr) return { success: false, error: sessionErr.message };

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true };
}

export async function resetPassword(newPassword: string): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
