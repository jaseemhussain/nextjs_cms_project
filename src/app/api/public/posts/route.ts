import { NextResponse } from "next/server";
import { ContentError, getPublicPosts } from "@/services/content.service";

/**
 * GET /api/public/posts?category=blog&search=hello&page=1&pageSize=5
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "3");

    const result = await getPublicPosts({
      categorySlug,
      search,
      page,
      pageSize,
    });

    return NextResponse.json({
      ...result,
      category: categorySlug ?? null,
      search: search ?? null,
    });
  } catch (error) {
    if (error instanceof ContentError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("public posts error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
