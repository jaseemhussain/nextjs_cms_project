import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import { ContentError } from "@/services/content.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";
import { updateSeo, type SeoInput } from "@/services/seo.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/content/:id/seo
 * Needs seo.update — Admin + SEO Specialist. Editor gets 403.
 * Separate from PATCH /api/content/:id so SEO has its own permission.
 * Body: { metaTitle, metaDescription, ogImageUrl, canonicalUrl } (empty = use fallback)
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "seo.update");

    const { id } = await context.params;
    const body = (await request.json()) as SeoInput;

    const content = await updateSeo(user, id, body);

    return NextResponse.json({ message: "SEO updated", content });
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

    console.error("seo update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
