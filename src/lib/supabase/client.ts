"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser‑safe Supabase client.
 * Uses the public URL and anon key that are exposed to the client.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
