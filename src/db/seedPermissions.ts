import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Seed a minimal set of **temporary bootstrap** permissions for each role.
 * TODO(phase-1.3): replace with a full permission matrix once the product stabilises.
 * The permission model is `resource` + `action` -> allowed boolean.
 * This starter set gives owners/admins full access and managers limited read/write.
 */
async function seedPermissions() {
  // Fetch all roles (owner, admin, manager, agent) across orgs
  const { data: roles, error: roleErr } = await supabaseAdmin
    .from('roles')
    .select('id, organization_id, name');
  if (roleErr) throw roleErr;

  const permissions: {
    role_id: string;
    resource: string;
    action: string;
    allowed: boolean;
  }[] = [];
  for (const role of roles ?? []) {
    const isOwnerOrAdmin = ['owner', 'admin'].includes(role.name);
    const isManager = role.name === 'manager';
    // Example resources – expand as the product grows
    const resources = ['profiles', 'team_members', 'organization_settings'];
    for (const resource of resources) {
      // Owner/Admin: full CRUD
      if (isOwnerOrAdmin) {
        permissions.push({
          role_id: role.id,
          resource,
          action: 'create',
          allowed: true,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'read',
          allowed: true,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'update',
          allowed: true,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'delete',
          allowed: true,
        });
      } else if (isManager) {
        // Manager: can read & update most resources
        permissions.push({
          role_id: role.id,
          resource,
          action: 'read',
          allowed: true,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'update',
          allowed: true,
        });
        // Disallow create/delete for manager
        permissions.push({
          role_id: role.id,
          resource,
          action: 'create',
          allowed: false,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'delete',
          allowed: false,
        });
      } else {
        // Agent: read‑only access
        permissions.push({
          role_id: role.id,
          resource,
          action: 'read',
          allowed: true,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'create',
          allowed: false,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'update',
          allowed: false,
        });
        permissions.push({
          role_id: role.id,
          resource,
          action: 'delete',
          allowed: false,
        });
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('permissions')
    .upsert(permissions, { onConflict: 'role_id,resource,action' });
  if (error) throw error;
  console.log('Seeded permissions for', roles?.length ?? 0, 'roles');
}

seedPermissions();
