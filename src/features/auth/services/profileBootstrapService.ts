import { createClient } from '@/lib/supabase/server';
import type { AuthenticatedUser } from '@/features/auth/types';

/**
 * Ensures a profile exists for an authenticated user.
 *
 * Phase 1.2.1:
 * - No organization assignment.
 * - No onboarding logic.
 * - Idempotent.
 */
export async function ensureProfileExists(
  user: AuthenticatedUser
): Promise<void> {
  const supabase = await createClient();

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile) {
    return;
  }

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      full_name: null,
      avatar_url: null,
    });

  if (insertError) {
    throw insertError;
  }

  await createProfileCreatedAuditLog(user.id);
}

/**
 * Creates a one-time audit entry when a profile
 * is first bootstrapped.
 */
async function createProfileCreatedAuditLog(
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: existingAudit, error: auditLookupError } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('actor_id', userId)
    .eq('action', 'profile_created')
    .maybeSingle();

  if (auditLookupError) {
    throw auditLookupError;
  }

  if (existingAudit) {
    return;
  }

  const { error: insertAuditError } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: null,
      actor_id: userId,
      action: 'profile_created',
      resource_type: 'profile',
      resource_id: userId,
      before: null,
      after: null,
      ip_address: null,
    });

  if (insertAuditError) {
    throw insertAuditError;
  }
}

/**
 * Bootstraps the currently authenticated user.
 *
 * Intended to be called from:
 * - auth/callback/route.ts
 *
 * NOT:
 * - middleware.ts
 */
export async function bootstrapAuthenticatedUser(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return;
  }

  if (!session.user.email) {
    return;
  }

  await ensureProfileExists({
    id: session.user.id,
    email: session.user.email,
  });
}