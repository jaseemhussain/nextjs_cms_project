import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { getActivityPage } from "@/services/activity.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

/**
 * GET /api/activity?entityType=content&entityId=&actor=email&page=1
 * Needs activity.read — Admin only. Read-only: there is no POST/PATCH/DELETE here.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "activity.read");

    const { searchParams } = new URL(request.url);
    const result = await getActivityPage({
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      actorEmail: searchParams.get("actor") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "20"),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    console.error("activity list error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
