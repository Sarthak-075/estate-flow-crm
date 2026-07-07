// src/features/organizations/createOrganizationAction.ts

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { bootstrapOrganization } from '@/lib/organizationBootstrapService';

const schema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(100),
});

export async function createOrganization(formData: FormData) {
  // 1️⃣ Validate input.
  const orgNameResult = schema.safeParse({
    organizationName: formData.get('organizationName'),
  });
  if (!orgNameResult.success) {
    // Return the first validation error to the UI.
    return {
      error: orgNameResult.error.issues[0]?.message ?? 'Invalid input',
    };
  }
  const orgName = orgNameResult.data.organizationName;

  // 2️⃣ Obtain the authenticated user via the SSR helper.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Unauthenticated – the middleware should already prevent this,
    // but we double‑guard here for defense in depth.
    redirect('/login');
  }

  // 3️⃣ Bootstrap the organization.
  try {
    await bootstrapOrganization({ ownerUserId: user.id, orgName });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create organization',
    };
  }

  // 4️⃣ Redirect to dashboard on success.
  redirect('/dashboard');
}