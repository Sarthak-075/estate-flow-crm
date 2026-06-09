// src/lib/organizationBootstrapService.ts

/**
 * Service‑role only bootstrap for a brand‑new organization.
 * All privileged DB writes happen through the `supabaseAdmin` client.
 * The function is deliberately isolated – it never runs in the browser.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Insert default roles for the given organization.
 * This mirrors the behaviour of the historic `seedRoles.ts` script but
 * operates only on the newly‑created organization.
 */
async function createDefaultRoles(orgId: string): Promise<void> {
  const roles = ['owner', 'admin', 'manager', 'agent'];
  const payload = roles.map((name) => ({ organization_id: orgId, name }));

  const { error } = await supabaseAdmin
    .from('roles')
    .upsert(payload, { onConflict: 'organization_id,name' });
  if (error) throw error;
}

/**
 * Bootstrap a new organization and associate the calling user as its owner.
 *
 * @param ownerUserId - The authenticated profile id that will become the owner.
 * @param orgName    - Name supplied by the onboarding form.
 */
export async function bootstrapOrganization(params: {
  ownerUserId: string;
  orgName: string;
}): Promise<{ organizationId: string }> {
  const { ownerUserId, orgName } = params;

  // Track the organization id for potential rollback.
  let orgId: string | null = null;

  try {
    // 1️⃣ Create the organization record.
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: orgName })
      .select('id')
      .single();
    if (orgError) throw orgError;
    orgId = orgData.id as string;

    // 2️⃣ Insert default roles.
    await createDefaultRoles(orgId);

    // 3️⃣ Retrieve the owner role id.
    const { data: ownerRole, error: ownerErr } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'owner')
      .single();
    if (ownerErr) throw ownerErr;
    const ownerRoleId = ownerRole.id as string;

    // 4️⃣ Verify the profile exists before creating the team_members record.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', ownerUserId)
      .single();
    if (profileError || !profile) {
      throw new Error('Profile not found');
    }
    // Now create the team_members record linking the user to the org as owner.
    const { error: memberErr } = await supabaseAdmin
      .from('team_members')
      .insert({
        organization_id: orgId,
        profile_id: ownerUserId,
        role_id: ownerRoleId,
        status: 'active',
      });
    if (memberErr) throw memberErr;

    // 5️⃣ Insert minimal organization_settings (timezone required).
    const { error: settingsErr } = await supabaseAdmin
      .from('organization_settings')
      .insert({ organization_id: orgId, timezone: 'UTC' });
    if (settingsErr) throw settingsErr;

    // 6️⃣ Update the profile to reference the new organization.
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ organization_id: orgId })
      .eq('id', ownerUserId);
    if (profileErr) throw profileErr;

    // 7️⃣ Audit log entry – consistent with existing naming.
    const { error: auditErr } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        organization_id: orgId,
        actor_id: ownerUserId,
        action: 'organization_created',
        resource_type: 'organization',
        resource_id: orgId,
      });
    if (auditErr) throw auditErr;

    return { organizationId: orgId };
  } catch (e) {
    if (orgId) {
      try {
        await supabaseAdmin.from('organizations').delete().eq('id', orgId);
      } catch (rollbackError) {
        console.error('Organization bootstrap rollback failed', rollbackError);
      }
    }
    throw e;
  }
}
