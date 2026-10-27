import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  CategoryError,
  createCategoryItem,
  getAllCategories,
} from "@/services/category.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

/**
 * GET /api/categories
 * Needs content.read
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.read");

    const categories = await getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return mapError(error);
  }
}

/**
 * POST /api/categories
 * Needs content.update
 * Body: { name, description?, slug? }
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.update");

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      slug?: string;
    };

    const category = await createCategoryItem(user, {
      name: body.name ?? "",
      description: body.description,
      slug: body.slug,
    });

    return NextResponse.json(
      { message: "Category created", category },
      { status: 201 }
    );
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

  console.error("categories route error:", error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
