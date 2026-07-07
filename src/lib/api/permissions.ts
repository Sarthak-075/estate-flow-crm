import { ForbiddenError } from "./errors";
import { getRequestContext } from "./context";

/**
 * Returns true if the authenticated user has the given role.
 */
export async function hasRole(role: string): Promise<boolean> {
  const { supabase } = await getRequestContext();

  const { data, error } = await supabase.rpc("current_user_role");

  if (error) {
    throw error;
  }

  return data === role;
}

/**
 * Throws if the authenticated user does not have the given role.
 */
export async function requireRole(role: string): Promise<void> {
  const allowed = await hasRole(role);

  if (!allowed) {
    throw new ForbiddenError(`Required role "${role}"`);
  }
}

/**
 * Returns true if the user has the given permission.
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const { supabase } = await getRequestContext();

  const { data, error } = await supabase.rpc("has_permission", {
    permission_name: permission,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/**
 * Throws if the permission is missing.
 */
export async function requirePermission(permission: string): Promise<void> {
  const allowed = await hasPermission(permission);

  if (!allowed) {
    throw new ForbiddenError(`Missing permission "${permission}"`);
  }
}
