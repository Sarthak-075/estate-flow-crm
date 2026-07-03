'use server';

import { resetPassword } from '@/features/auth/services/authService';
import { resetPasswordSchema } from '@/features/auth/validators/resetPasswordValidator';
import type { AuthActionResult } from '@/features/auth/types';

/** Server Action for resetting password via Supabase recovery link */
export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  } as Record<string, unknown>;

  const parse = resetPasswordSchema.safeParse(raw);
  if (!parse.success) {
    return {
      success: false,
      error: parse.error.issues.map((e) => e.message).join(', '),
    };
  }

  const { password } = parse.data;
  const result = await resetPassword(password);
  return result;
}
