-- Module 7A: Categories (many-to-many with content)

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_name_unique UNIQUE (name),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS content_categories (
  content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_content_categories_category_id
  ON content_categories (category_id);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- Seed starter categories
INSERT INTO categories (name, slug, description) VALUES
  ('Blog', 'blog', 'General blog posts'),
  ('News', 'news', 'Company and product news'),
  ('Tutorials', 'tutorials', 'How-to guides and learning posts'),
  ('Live News', 'live-news', 'Breaking updates and live coverage')
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE categories IS 'Content taxonomy labels (Blog, News, etc.)';
COMMENT ON TABLE content_categories IS 'Many-to-many: one post can have many categories';
