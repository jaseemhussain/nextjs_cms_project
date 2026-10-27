import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { ForbiddenError, getUserAccess } from "@/services/rbac.service";

/**
 * GET /api/auth/me
 * Returns user + roles + permissions (fresh from DB, not from JWT)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const access = await getUserAccess(user.id);

    return NextResponse.json({
      message: "Authenticated",
      user,
      roles: access.roles.map((role) => role.name),
      permissions: access.permissions,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    console.error("auth/me error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
