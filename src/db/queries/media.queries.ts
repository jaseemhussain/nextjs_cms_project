import { query } from "@/lib/db/query";
import type { Media, MediaWithUploader } from "@/types/media";

export async function createMedia(input: {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: string;
}): Promise<Media> {
  const result = await query<Media>(
    `INSERT INTO media (filename, original_name, mime_type, size_bytes, url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, filename, original_name, mime_type, size_bytes, url, uploaded_by, created_at`,
    [
      input.filename,
      input.originalName,
      input.mimeType,
      input.sizeBytes,
      input.url,
      input.uploadedBy,
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create media record");
  }
  return row;
}

export async function listMedia(): Promise<MediaWithUploader[]> {
  const result = await query<MediaWithUploader>(
    `SELECT m.id, m.filename, m.original_name, m.mime_type, m.size_bytes, m.url,
            m.uploaded_by, m.created_at,
            u.name AS uploader_name,
            u.email AS uploader_email
     FROM media m
     INNER JOIN users u ON u.id = m.uploaded_by
     ORDER BY m.created_at DESC`
  );
  return result.rows;
}

export async function findMediaById(id: string): Promise<Media | null> {
  const result = await query<Media>(
    `SELECT id, filename, original_name, mime_type, size_bytes, url, uploaded_by, created_at
     FROM media
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deleteMediaById(id: string): Promise<Media | null> {
  const result = await query<Media>(
    `DELETE FROM media
     WHERE id = $1
     RETURNING id, filename, original_name, mime_type, size_bytes, url, uploaded_by, created_at`,
    [id]
  );
  return result.rows[0] ?? null;
}
