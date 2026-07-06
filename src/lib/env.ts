import { z } from 'zod';

/**
 * Environment validation schema.
 * Validates only the variables we expose to the client and the server‑only service key.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/** Validate at import time – throws if any required env var is missing. */
export const env: z.infer<typeof envSchema> = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
