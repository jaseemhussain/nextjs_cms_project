import { query } from "@/lib/db/query";
import type { Permission, Role } from "@/types/rbac";

export async function listRoles(): Promise<Role[]> {
  const result = await query<Role>(
    `SELECT id, name, description, created_at
     FROM roles
     ORDER BY name ASC`
  );
  return result.rows;
}

export async function findRoleByName(name: string): Promise<Role | null> {
  const result = await query<Role>(
    `SELECT id, name, description, created_at
     FROM roles
     WHERE name = $1
     LIMIT 1`,
    [name]
  );
  return result.rows[0] ?? null;
}

export async function getRolesForUser(userId: string): Promise<Role[]> {
  const result = await query<Role>(
    `SELECT r.id, r.name, r.description, r.created_at
     FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1
     ORDER BY r.name ASC`,
    [userId]
  );
  return result.rows;
}

export async function getPermissionKeysForUser(
  userId: string
): Promise<string[]> {
  const result = await query<{ key: string }>(
    `SELECT DISTINCT p.key
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1
     ORDER BY p.key ASC`,
    [userId]
  );
  return result.rows.map((row) => row.key);
}

export async function userHasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const result = await query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM user_roles ur
     INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
     INNER JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = $1
       AND p.key = $2
     LIMIT 1`,
    [userId, permissionKey]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Replace all roles for a user (simple sync) */
export async function setUserRolesByNames(
  userId: string,
  roleNames: string[]
): Promise<Role[]> {
  await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  if (roleNames.length === 0) {
    return [];
  }

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, r.id
     FROM roles r
     WHERE r.name = ANY($2::text[])`,
    [userId, roleNames]
  );

  return getRolesForUser(userId);
}

export async function listPermissions(): Promise<Permission[]> {
  const result = await query<Permission>(
    `SELECT id, key, description, created_at
     FROM permissions
     ORDER BY key ASC`
  );
  return result.rows;
}
