import { NextResponse } from "next/server";
import { ContentError, getPublicPostBySlug } from "@/services/content.service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/public/posts/:slug
 * No auth — draft slug pe 404 (leak mat karo)
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const post = await getPublicPostBySlug(slug);

    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof ContentError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("public post by slug error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
