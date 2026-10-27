import { NextResponse } from "next/server";
import { listRoles } from "@/db/queries/rbac.queries";
import { requireAuth, UnauthorizedError } from "@/lib/auth";

/**
 * GET /api/roles
 * Logged-in user roles list dekh sakta hai (assignment UI ke liye)
 */
export async function GET(request: Request) {
  try {
    await requireAuth(request);
    const roles = await listRoles();

    return NextResponse.json({ roles });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    console.error("roles list error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
