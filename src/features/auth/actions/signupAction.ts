'use server';

import { signUp } from '@/features/auth/services/authService';
import { signupSchema } from '@/features/auth/validators/signupValidator';
import type { AuthActionResult } from '@/features/auth/types';

/**
 * Server Action for user signup.
 * Expects a FormData with `email` and `password` fields.
 */
export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  } as Record<string, unknown>;

  const parse = signupSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.issues.map((e) => e.message).join(', '),
    };
  }

  const { email, password } = parse.data;
  const result = await signUp(email, password);
  return result;
}
