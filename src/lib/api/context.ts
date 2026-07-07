import type { User } from "@supabase/supabase-js";

import { getSupabase, requireUser } from "./auth";

export interface RequestContext {
  supabase: Awaited<ReturnType<typeof getSupabase>>;
  user: User;
}

/**
 * Builds the authenticated request context.
 *
 * This is the primary entry point for API routes.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const supabase = await getSupabase();
  const user = await requireUser();

  return {
    supabase,
    user,
  };
}
