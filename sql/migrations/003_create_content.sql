-- Module 6: Content Management (draft / published workflow)

CREATE TABLE IF NOT EXISTS content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT content_slug_unique UNIQUE (slug),
  CONSTRAINT content_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_content_status ON content (status);
CREATE INDEX IF NOT EXISTS idx_content_author_id ON content (author_id);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content (published_at DESC);

COMMENT ON TABLE content IS 'CMS pages/posts. Public site must only read status = published.';
COMMENT ON COLUMN content.slug IS 'URL-friendly unique key, e.g. getting-started-with-nextjs';
COMMENT ON COLUMN content.status IS 'draft = admin only; published = public; archived = hidden';
COMMENT ON COLUMN content.published_at IS 'Set when first published; null while draft';
