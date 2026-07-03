'use server';

import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

/**
 * Service‑role Supabase client for privileged operations (e.g., migrations, admin tasks).
 * NEVER expose this client to the browser.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
