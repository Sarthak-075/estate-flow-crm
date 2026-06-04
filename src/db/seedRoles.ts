import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Seed default roles for every existing organization.
 * Roles: owner, admin, manager, agent.
 * This script assumes at least one organization already exists; it will **not**
 * create a demo organization.
 */
async function seedRoles() {
  // Fetch all organizations – we will seed roles for each one.
  const { data: orgs, error: orgErr } = await supabaseAdmin
    .from('organizations')
    .select('id');
  if (orgErr) throw orgErr;

  if (!orgs || orgs.length === 0) {
    console.warn('⚠️ No organizations found – skipping role seeding.');
    return;
  }

  const roles = ['owner', 'admin', 'manager', 'agent'];

  // Upsert roles for every organization.
  for (const org of orgs) {
    const { error } = await supabaseAdmin.from('roles').upsert(
      roles.map((name) => ({ organization_id: org.id, name })),
      { onConflict: 'organization_id,name' }
    );
    if (error) throw error;
    console.log('Seeded roles for organization', org.id);
  }
}

seedRoles();