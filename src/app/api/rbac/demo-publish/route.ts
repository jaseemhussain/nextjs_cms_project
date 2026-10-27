import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

/**
 * POST /api/rbac/demo-publish
 * Learning endpoint — content table se pehle permission flow test.
 * Real publish Module (Content) mein aayega.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.publish");

    return NextResponse.json({
      message: "Publish allowed (demo)",
      by: user.email,
      permission: "content.publish",
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    console.error("demo-publish error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
