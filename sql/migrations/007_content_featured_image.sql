-- Module: Featured image for professional public cards

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS featured_image_url VARCHAR(500);

COMMENT ON COLUMN content.featured_image_url IS
  'Hero/card image URL — usually /uploads/... from Media Library';
