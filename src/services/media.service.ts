import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createMedia,
  deleteMediaById,
  findMediaById,
  listMedia,
} from "@/db/queries/media.queries";
import { withTransaction } from "@/lib/db/transaction";
import { logActivity } from "@/services/activity.service";
import type { ActivityActor } from "@/types/activity";
import type { Media, MediaWithUploader } from "@/types/media";
import type { PublicUser } from "@/types/user";

export class MediaError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "MediaError";
  }
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function extensionFor(mimeType: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (fromName && fromName.length <= 8) {
    return fromName;
  }

  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? "";
}

export async function getMediaLibrary(): Promise<MediaWithUploader[]> {
  return listMedia();
}

export async function uploadMediaFile(
  uploader: PublicUser,
  file: File
): Promise<Media> {
  if (!file || file.size === 0) {
    throw new MediaError("file is required", 400);
  }

  if (file.size > MAX_BYTES) {
    throw new MediaError("File too large (max 5MB)", 400);
  }

  if (!ALLOWED_MIME.has(file.type)) {
    throw new MediaError(
      "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, PDF",
      400
    );
  }

  const ext = extensionFor(file.type, file.name);
  const filename = `${randomUUID()}${ext}`;
  const diskPath = path.join(UPLOAD_DIR, filename);
  const url = `/uploads/${filename}`;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  try {
    return await withTransaction(async () => {
      const media = await createMedia({
        filename,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        url,
        uploadedBy: uploader.id,
      });

      await logActivity(uploader, {
        action: "media.upload",
        entityType: "media",
        entityId: media.id,
        entityLabel: media.original_name,
        changes: {
          url: { from: null, to: media.url },
          mime_type: { from: null, to: media.mime_type },
          size_bytes: { from: null, to: media.size_bytes },
        },
      });

      return media;
    });
  } catch (error) {
    // The disk is not part of the DB transaction, so clean it up by hand.
    await unlink(diskPath).catch(() => undefined);
    throw error;
  }
}

export async function removeMedia(
  actor: ActivityActor,
  id: string
): Promise<void> {
  const deleted = await withTransaction(async () => {
    const existing = await findMediaById(id);
    if (!existing) {
      throw new MediaError("Media not found", 404);
    }

    const row = await deleteMediaById(id);
    if (!row) {
      throw new MediaError("Media not found", 404);
    }

    await logActivity(actor, {
      action: "media.delete",
      entityType: "media",
      entityId: id,
      entityLabel: row.original_name,
      changes: { url: { from: row.url, to: null } },
    });

    return row;
  });

  // Delete the file only after COMMIT; if the DB part failed, the file must stay.
  const diskPath = path.join(UPLOAD_DIR, deleted.filename);
  await unlink(diskPath).catch(() => undefined);
}
