// src/lib/organizationBootstrapService.ts

/**
 * Service-role only bootstrap for a brand-new organization.
 * All privileged DB writes happen through the `supabaseAdmin` client.
 * The function is deliberately isolated – it never runs in the browser.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Insert default roles for the given organization.
 * This mirrors the behaviour of the historic `seedRoles.ts` script but
 * operates only on the newly-created organization.
 */
async function createDefaultRoles(orgId: string): Promise<void> {
  const roles = ['owner', 'admin', 'manager', 'agent'];

  const payload = roles.map((name) => ({
    organization_id: orgId,
    name,
  }));

  const { error } = await supabaseAdmin.from('roles').upsert(payload, {
    onConflict: 'organization_id,name',
  });

  if (error) {
    throw error;
  }
}

/**
 * Bootstrap a new organization and associate the calling user as its owner.
 */
export async function bootstrapOrganization(params: {
  ownerUserId: string;
  orgName: string;
}): Promise<{ organizationId: string }> {
  const { ownerUserId, orgName } = params;

  let orgId: string | null = null;

  try {
    // 1. Create organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
      })
      .select('id')
      .single();

    if (orgError) {
      throw orgError;
    }

    orgId = orgData.id as string;

    // 2. Create default roles
    await createDefaultRoles(orgId);

    // 3. Retrieve owner role
    const { data: ownerRole, error: ownerRoleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', 'owner')
      .single();

    if (ownerRoleError) {
      throw ownerRoleError;
    }

    const ownerRoleId = ownerRole.id as string;

    // 4. Verify profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', ownerUserId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    /**
     * Phase 1.3 RBAC Hardening
     * Enforce single active organization membership.
     */
    const { data: existingMembership, error: membershipLookupError } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('profile_id', ownerUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipLookupError) {
      throw membershipLookupError;
    }

    if (existingMembership) {
      throw new Error('User already belongs to an active organization');
    }

    // 5. Create owner membership
    const { error: memberError } = await supabaseAdmin.from('team_members').insert({
      organization_id: orgId,
      profile_id: ownerUserId,
      role_id: ownerRoleId,
      status: 'active',
    });

    if (memberError) {
      throw memberError;
    }

    // 6. Create organization settings
    const { error: settingsError } = await supabaseAdmin.from('organization_settings').insert({
      organization_id: orgId,
      timezone: 'UTC',
    });

    if (settingsError) {
      throw settingsError;
    }

    // 7. Link profile to organization
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        organization_id: orgId,
      })
      .eq('id', ownerUserId);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    // 8. Audit log
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      organization_id: orgId,
      actor_id: ownerUserId,
      action: 'organization_created',
      resource_type: 'organization',
      resource_id: orgId,
    });

    if (auditError) {
      throw auditError;
    }

    return {
      organizationId: orgId,
    };
  } catch (error) {
    if (orgId) {
      try {
        await supabaseAdmin.from('organizations').delete().eq('id', orgId);
      } catch (rollbackError) {
        console.error('Organization bootstrap rollback failed', rollbackError);
      }
    }

    throw error;
  }
}
