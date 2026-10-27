-- Ensure Live News category exists (idempotent for DBs that already ran 004)

INSERT INTO categories (name, slug, description) VALUES
  ('Live News', 'live-news', 'Breaking updates and live coverage')
ON CONFLICT (slug) DO NOTHING;
