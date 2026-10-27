import { NextResponse } from "next/server";
import { listUsersWithRoles } from "@/db/queries/users-admin.queries";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { AuthError, createUserByAdmin } from "@/services/auth.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

/**
 * GET /api/users
 * Needs users.manage — Admin only (Editor 403)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "users.manage");

    const users = await listUsersWithRoles();
    return NextResponse.json({ users });
  } catch (error) {
    return mapUsersError(error);
  }
}

/**
 * POST /api/users
 * Admin creates a new user (optional roles). Does not switch login session.
 * Body: { name, email, password, roles?: string[] }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    await requirePermission(actor, "users.manage");

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      roles?: string[];
    };

    const roles = Array.isArray(body.roles) ? body.roles : [];

    const created = await createUserByAdmin(actor, {
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      roles,
    });

    const users = await listUsersWithRoles();
    const withRoles = users.find((u) => u.id === created.id);

    return NextResponse.json(
      {
        message: "User created",
        user: withRoles ?? { ...created, roles },
      },
      { status: 201 }
    );
  } catch (error) {
    return mapUsersError(error);
  }
}

function mapUsersError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
  if (error instanceof AuthError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode }
    );
  }

  console.error("users API error:", error);
  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 }
  );
}
