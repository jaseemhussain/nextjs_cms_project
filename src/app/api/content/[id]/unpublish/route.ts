import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { ContentError, revertToDraft } from "@/services/content.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/content/:id/unpublish
 * Needs content.publish — published → draft (public se hatao)
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.publish");

    const { id } = await context.params;
    const content = await revertToDraft(user, id);

    return NextResponse.json({
      message: "Content unpublished (back to draft)",
      content,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof ContentError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("unpublish error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
