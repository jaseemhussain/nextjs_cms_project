import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  ContentError,
  deleteContent,
  getAdminContentById,
  updateDraft,
} from "@/services/content.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/content/:id
 * Needs content.read — drafts allowed for staff
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.read");

    const { id } = await context.params;
    const content = await getAdminContentById(id);

    return NextResponse.json({ content });
  } catch (error) {
    return mapError(error);
  }
}

/**
 * PATCH /api/content/:id
 * Needs content.update — draft YA published dono edit
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.update");

    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      slug?: string;
      categoryIds?: string[];
      featuredImageUrl?: string | null;
    };

    const content = await updateDraft(user, id, body);
    return NextResponse.json({ message: "Content updated", content });
  } catch (error) {
    return mapError(error);
  }
}

/**
 * DELETE /api/content/:id
 * Needs content.delete
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.delete");

    const { id } = await context.params;
    await deleteContent(user, id);

    return NextResponse.json({ message: "Content deleted" });
  } catch (error) {
    return mapError(error);
  }
}

function mapError(error: unknown) {
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

  console.error("content [id] error:", error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
