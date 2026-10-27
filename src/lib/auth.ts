import { findUserById } from "@/db/queries/users.queries";
import { verifyToken } from "@/lib/jwt";
import type { PublicUser } from "@/types/user";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
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

/**
 * Request header se JWT nikaalta hai.
 * Expected format: Authorization: Bearer <token>
 */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

/**
 * Protected routes ke liye: token verify + DB se latest user.
 * Token valid ho lekin user delete/inactive ho toh bhi reject.
 */
export async function requireAuth(request: Request): Promise<PublicUser> {
  const token = extractBearerToken(request);

  if (!token) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const user = await findUserById(payload.userId);

  if (!user || !user.is_active) {
    throw new UnauthorizedError("User not found or inactive");
  }

  return toPublicUser(user);
}
