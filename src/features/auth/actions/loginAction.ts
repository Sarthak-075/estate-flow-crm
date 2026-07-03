'use server';

import { signIn } from '@/features/auth/services/authService';
import { loginSchema } from '@/features/auth/validators/loginValidator';
import type { AuthActionResult } from '@/features/auth/types';

/** Server Action for user login */
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  } as Record<string, unknown>;

  const parse = loginSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.issues.map((e) => e.message).join(', '),
    };
  }

  const { email, password } = parse.data;
  const result = await signIn(email, password);
  return result;
}
