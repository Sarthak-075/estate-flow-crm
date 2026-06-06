"use server";

import { signOut } from '@/features/auth/services/authService';
import type { AuthActionResult } from '@/features/auth/types';

/** Server Action to log the user out */
export async function logoutAction(): Promise<AuthActionResult> {
  const result = await signOut();
  return result;
}
