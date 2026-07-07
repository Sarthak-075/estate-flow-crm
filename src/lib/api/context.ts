import type { User } from "@supabase/supabase-js";

import { getSupabase, requireUser } from "./auth";

export interface RequestContext {
  /**
   * Authenticated Supabase client.
   */
  supabase: Awaited<ReturnType<typeof getSupabase>>;

  /**
   * Current authenticated user.
   */
  user: User;

  /**
   * Current organization ID.
   *
   * This will be populated once organization membership
   * resolution is added in later phases.
   */
  organizationId?: string;

  /**
   * Unique request identifier used for tracing.
   */
  requestId?: string;
}

/**
 * Builds the authenticated request context.
 *
 * This is the primary entry point for all API routes.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const supabase = await getSupabase();
  const user = await requireUser();

  // Organization resolution will be implemented in a later phase.
  const organizationId: string | undefined = undefined;

  return {
    supabase,
    user,
    organizationId,
  };
}
