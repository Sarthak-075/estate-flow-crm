import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AuthenticatedUser } from "@/features/auth/types";
import type { User } from "@supabase/supabase-js";

/**
 * Read‑only hook that returns the currently authenticated user, if any.
 * It subscribes to Supabase auth state changes so the value stays up‑to‑date.
 * No mutation functions are exposed – callers cannot modify the session.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapUser(session?.user ?? null));
      setLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };

  /** Convert Supabase `User | null` → our `AuthenticatedUser | null` */
  function mapUser(u: User | null): AuthenticatedUser | null {
    if (!u) return null;
    return { id: u.id, email: u.email ?? "" };
  }
}
