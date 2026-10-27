import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth";
import {
  getMediaLibrary,
  MediaError,
  uploadMediaFile,
} from "@/services/media.service";
import { ForbiddenError, requirePermission } from "@/services/rbac.service";

/**
 * GET /api/media
 * List media library (needs media.upload OR content.read)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "media.upload");

    const items = await getMediaLibrary();
    return NextResponse.json({ items });
  } catch (error) {
    return mapError(error);
  }
}

/**
 * POST /api/media
 * multipart/form-data field: "file"
 * Needs media.upload
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    await requirePermission(user, "media.upload");

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new MediaError('Expected form field "file"', 400);
    }

    const media = await uploadMediaFile(user, file);

    return NextResponse.json(
      { message: "Uploaded", media },
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
  if (error instanceof MediaError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode }
    );
  }

  console.error("media route error:", error);
  return NextResponse.json({ message: "Internal server error" }, { status: 500 });
}
