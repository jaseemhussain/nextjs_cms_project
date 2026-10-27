import { NextResponse } from "next/server";
import { findUserById } from "@/db/queries/users.queries";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  changeUserRoles,
  ForbiddenError,
  getUserAccess,
  requirePermission,
} from "@/services/rbac.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/users/:id/roles
 * Body: { roles: ["editor", "viewer"] }
 * Requires: users.manage
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    await requirePermission(actor, "users.manage");

    const { id: targetUserId } = await context.params;
    const target = await findUserById(targetUserId);

    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as { roles?: string[] };
    const roles = body.roles ?? [];

    if (!Array.isArray(roles)) {
      return NextResponse.json(
        { message: "roles must be an array of role names" },
        { status: 400 }
      );
    }

    await changeUserRoles(actor, target, roles);
    const access = await getUserAccess(targetUserId);

    return NextResponse.json({
      message: "Roles updated",
      userId: targetUserId,
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

    console.error("assign roles error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
