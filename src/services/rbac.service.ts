import {
  getPermissionKeysForUser,
  getRolesForUser,
  setUserRolesByNames,
  userHasPermission,
} from "@/db/queries/rbac.queries";
import { withTransaction } from "@/lib/db/transaction";
import { diffChanges, logActivity } from "@/services/activity.service";
import type { ActivityActor } from "@/types/activity";
import type { PublicUser } from "@/types/user";
import type { Role } from "@/types/rbac";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getUserAccess(userId: string): Promise<{
  roles: Role[];
  permissions: string[];
}> {
  const [roles, permissions] = await Promise.all([
    getRolesForUser(userId),
    getPermissionKeysForUser(userId),
  ]);

  return { roles, permissions };
}

/**
 * Line-by-line mental model:
 * 1) user already authenticated (requireAuth)
 * 2) DB se check: user ke roles → permissions mein key hai?
 * 3) nahi → 403 Forbidden
 */
export async function requirePermission(
  user: PublicUser,
  permissionKey: string
): Promise<void> {
  const allowed = await userHasPermission(user.id, permissionKey);

  if (!allowed) {
    throw new ForbiddenError(
      `Missing permission: ${permissionKey}`
    );
  }
}

/**
 * Replaces a user's roles (DELETE old + INSERT new). Wrapped in a transaction so
 * a failure halfway can't leave the user with no roles at all.
 */
export async function assignRolesToUser(
  userId: string,
  roleNames: string[]
): Promise<Role[]> {
  const normalized = roleNames.map((name) => name.trim().toLowerCase());
  return withTransaction(() => setUserRolesByNames(userId, normalized));
}

/** Admin changes someone's roles — saved together with an activity log entry. */
export async function changeUserRoles(
  actor: ActivityActor,
  target: { id: string; email: string },
  roleNames: string[]
): Promise<Role[]> {
  return withTransaction(async () => {
    const before = (await getRolesForUser(target.id)).map((r) => r.name);
    const roles = await assignRolesToUser(target.id, roleNames);
    const after = roles.map((r) => r.name);

    const changes = diffChanges({ roles: before }, { roles: after }, ["roles"]);
    if (changes) {
      await logActivity(actor, {
        action: "user.roles_update",
        entityType: "user",
        entityId: target.id,
        entityLabel: target.email,
        changes,
      });
    }

    return roles;
  });
}
