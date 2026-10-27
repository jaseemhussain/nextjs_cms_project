import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "@/db/queries/users.queries";
import { withTransaction } from "@/lib/db/transaction";
import { signToken } from "@/lib/jwt";
import { logActivity } from "@/services/activity.service";
import { assignRolesToUser } from "@/services/rbac.service";
import type { ActivityActor } from "@/types/activity";
import type { PublicUser } from "@/types/user";

const BCRYPT_ROUNDS = 10;

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Shared create rules — public register + admin invite dono yahi use karte hain.
 */
async function createAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!email || !name || !password) {
    throw new AuthError("email, password, and name are required", 400);
  }

  if (!validateEmail(email)) {
    throw new AuthError("Invalid email format", 400);
  }

  if (password.length < 8) {
    throw new AuthError("Password must be at least 8 characters", 400);
  }

  if (name.length < 2) {
    throw new AuthError("Name must be at least 2 characters", 400);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AuthError("Email already registered", 409);
  }

  // 10 = cost factor (2^10 rounds) — hash length nahi!
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await createUser({
    email,
    name,
    passwordHash,
  });

  return toPublicUser(user);
}

/**
 * Public self-register — returns JWT so user can log in immediately.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: PublicUser; token: string }> {
  const user = await createAccount(input);

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  return { user, token };
}

/**
 * Admin creates a teammate — no token (Admin session stay same).
 * User, roles, and the log entry are saved together in one transaction.
 */
export async function createUserByAdmin(
  actor: ActivityActor,
  input: {
    email: string;
    password: string;
    name: string;
    roles: string[];
  }
): Promise<PublicUser> {
  return withTransaction(async () => {
    const user = await createAccount(input);
    const roles =
      input.roles.length > 0
        ? (await assignRolesToUser(user.id, input.roles)).map((r) => r.name)
        : [];

    await logActivity(actor, {
      action: "user.create",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.email,
      changes: {
        name: { from: null, to: user.name },
        roles: { from: null, to: roles },
      },
    });

    return user;
  });
}

/**
 * Business logic: login
 * Wrong password OR unknown email → same message (email enumeration avoid)
 */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: PublicUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new AuthError("email and password are required", 400);
  }

  const user = await findUserByEmail(email);

  if (!user || !user.is_active) {
    throw new AuthError("Invalid email or password", 401);
  }

  const matches = await bcrypt.compare(password, user.password_hash);

  if (!matches) {
    throw new AuthError("Invalid email or password", 401);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  return {
    user: toPublicUser(user),
    token,
  };
}
