import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  CategoryError,
  removeCategory,
  updateCategoryItem,
} from "@/services/category.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/categories/:id
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.update");

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      slug?: string;
    };

    const category = await updateCategoryItem(user, id, body);
    return NextResponse.json({ message: "Category updated", category });
  } catch (error) {
    return mapError(error);
  }
}

/**
 * DELETE /api/categories/:id
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.update");

    const { id } = await context.params;
    await removeCategory(user, id);

    return NextResponse.json({ message: "Category deleted" });
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
  if (error instanceof CategoryError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode }
    );
  }

  console.error("categories [id] error:", error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
