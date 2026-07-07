import { requireRole, requirePermission } from "./permissions";

export interface AuthorizationOptions {
  role?: string;
  permission?: string;
}

/**
 * Authorize the current request.
 */
export async function authorize(options: AuthorizationOptions): Promise<void> {
  if (options.role) {
    await requireRole(options.role);
  }

  if (options.permission) {
    await requirePermission(options.permission);
  }
}
