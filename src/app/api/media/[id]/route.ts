import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { MediaError, removeMedia } from "@/services/media.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/media/:id
 * Needs media.upload — deletes DB row + disk file
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "media.upload");

    const { id } = await context.params;
    await removeMedia(user, id);

    return NextResponse.json({ message: "Media deleted" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof MediaError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("media delete error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
