import { query } from "@/lib/db/query";
import type { User } from "@/types/user";

/**
 * Data-access layer — sirf SQL.
 * Business rules (hash password, check permissions) services/ mein aayengi (Module 3).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash, name, is_active, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, password_hash, name, is_active, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, name, is_active, created_at, updated_at`,
    [input.email, input.name, input.passwordHash]
  );

  const user = result.rows[0];
  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

export async function countUsers(): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users`
  );

  return Number(result.rows[0]?.count ?? 0);
}
