import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  ContentError,
  createDraft,
  getAdminContentList,
} from "@/services/content.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";
import type { ContentStatus } from "@/types/content";

/**
 * GET /api/content?search=&page=1&pageSize=5&status=draft
 * Admin list with search + pagination
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "3");
    const statusParam = searchParams.get("status");
    const status =
      statusParam === "draft" ||
      statusParam === "published" ||
      statusParam === "archived"
        ? (statusParam as ContentStatus)
        : undefined;

    const result = await getAdminContentList({
      search,
      page,
      pageSize,
      status,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapError(error);
  }
}

/**
 * POST /api/content
 * Create draft (needs content.create)
 * Body: { title, body?, slug?, categoryIds? }
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "content.create");

    const body = (await request.json()) as {
      title?: string;
      body?: string;
      slug?: string;
      categoryIds?: string[];
      featuredImageUrl?: string | null;
    };

    const content = await createDraft(user, {
      title: body.title ?? "",
      body: body.body,
      slug: body.slug,
      categoryIds: body.categoryIds,
      featuredImageUrl: body.featuredImageUrl,
    });

    return NextResponse.json(
      { message: "Draft created", content },
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
  if (error instanceof ContentError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode }
    );
  }

  console.error("content route error:", error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
