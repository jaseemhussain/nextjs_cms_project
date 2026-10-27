import "dotenv/config";
import { Pool } from "pg";

/**
 * Bootstrap helper (CLI) — pehle admin/editor assign karne ke liye.
 * Chicken-egg: API pe users.manage chahiye, lekin pehle kisi ke paas role nahi.
 * Isliye pehli assignment CLI se (real companies seed/admin bootstrap use karti hain).
 *
 * Usage:
 *   npx tsx scripts/assign-role.ts sarah@technova.com editor
 *   npx tsx scripts/assign-role.ts sarah@technova.com admin
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const roleName = process.argv[3]?.trim().toLowerCase();

  if (!email || !roleName) {
    console.error("Usage: npx tsx scripts/assign-role.ts <email> <role>");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const userRes = await pool.query(
      `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = userRes.rows[0] as { id: string; email: string } | undefined;

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    const roleRes = await pool.query(
      `SELECT id, name FROM roles WHERE name = $1 LIMIT 1`,
      [roleName]
    );
    const role = roleRes.rows[0] as { id: string; name: string } | undefined;

    if (!role) {
      console.error(`Role not found: ${roleName}`);
      process.exit(1);
    }

    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user.id, role.id]
    );

    const perms = await pool.query(
      `SELECT DISTINCT p.key
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1
       ORDER BY p.key`,
      [user.id]
    );

    console.log(`Assigned role "${role.name}" to ${user.email}`);
    console.log(
      "Permissions:",
      perms.rows.map((row: { key: string }) => row.key).join(", ")
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
