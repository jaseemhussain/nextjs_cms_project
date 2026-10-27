import { query } from "@/lib/db/query";

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  roles: string[];
};

export async function listUsersWithRoles(): Promise<UserListItem[]> {
  const result = await query<{
    id: string;
    email: string;
    name: string;
    is_active: boolean;
    created_at: Date;
    roles: string[] | null;
  }>(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.is_active,
       u.created_at,
       COALESCE(
         array_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
         '{}'
       ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    is_active: row.is_active,
    created_at: row.created_at,
    roles: row.roles ?? [],
  }));
}
