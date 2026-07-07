"use server";

import { sendPasswordReset } from '@/features/auth/services/authService';
import { forgotPasswordSchema } from '@/features/auth/validators/forgotPasswordValidator';
import type { AuthActionResult } from '@/features/auth/types';

/** Server Action for requesting a password reset email */
export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email'),
  } as Record<string, unknown>;

  const parse = forgotPasswordSchema.safeParse(raw);
  if (!parse.success) {
    return { success: false, error: parse.error.issues.map((e) => e.message).join(', ') };
  }

  const { email } = parse.data;
  const result = await sendPasswordReset(email);
  return result;
}
