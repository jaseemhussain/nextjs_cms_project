-- Module 7B: Media Library

CREATE TABLE IF NOT EXISTS media (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       VARCHAR(255) NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(120) NOT NULL,
  size_bytes     INTEGER NOT NULL,
  url            VARCHAR(500) NOT NULL,
  uploaded_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT media_size_positive CHECK (size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media (mime_type);

COMMENT ON TABLE media IS 'Uploaded files (images/docs). Files live on disk; metadata in DB.';
COMMENT ON COLUMN media.filename IS 'Stored filename on disk (UUID-based, collision-safe)';
COMMENT ON COLUMN media.url IS 'Public path e.g. /uploads/abc.jpg served from public/uploads';
COMMENT ON COLUMN media.original_name IS 'User-facing original filename';
