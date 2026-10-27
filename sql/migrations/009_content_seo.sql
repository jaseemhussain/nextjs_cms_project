-- Module 8: SEO metadata per post
-- All nullable: empty = fall back to title / body excerpt / featured image.
-- Lengths are hard DB limits; recommended lengths (60 / 160) are enforced in the service layer.

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS meta_title       VARCHAR(70),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(170),
  ADD COLUMN IF NOT EXISTS og_image_url     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS canonical_url    VARCHAR(500);

COMMENT ON COLUMN content.meta_title IS 'Google result title; falls back to content.title';
COMMENT ON COLUMN content.meta_description IS 'Google snippet; falls back to body excerpt';
COMMENT ON COLUMN content.og_image_url IS 'Social share image; falls back to featured_image_url';
COMMENT ON COLUMN content.canonical_url IS 'Original URL if this content is duplicated elsewhere';
