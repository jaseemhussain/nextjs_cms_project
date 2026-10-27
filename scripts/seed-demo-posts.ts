import "dotenv/config";
import { Pool } from "pg";

/**
 * Seeds polished demo posts (one per category) for tech-lead demos.
 * Idempotent: upserts by slug. Run: npm run db:seed-demo
 */
/** Local /uploads paths — run `npm run db:fix-demo-images` after seed to download files. */
const DEMO_POSTS = [
  {
    slug: "shipping-faster-with-draft-publish",
    title: "Shipping faster with Draft → Publish",
    categorySlug: "blog",
    image: "/uploads/demo-blog-draft-publish.jpg",
    body: `At NovaCMS we treat every article as a lifecycle, not a file.

Writers save drafts freely. Editors review. Only published posts reach the public site — so the homepage never shows half-finished work.

This workflow is the same pattern you will see in WordPress, Contentful, and most enterprise CMSs: separate authoring from distribution.`,
  },
  {
    slug: "novacms-1-2-release-notes",
    title: "NovaCMS 1.2 — Media Library & Roles",
    categorySlug: "news",
    image: "/uploads/demo-news-release.jpg",
    body: `Today we shipped NovaCMS 1.2 for the learning CMS track.

Highlights:
• Media Library with local /uploads storage
• Featured images on public cards
• Role-based access (Admin vs Editor)
• Search + pagination on public and admin lists

Upgrade path: run migrations, then assign roles with npm run db:assign-role.`,
  },
  {
    slug: "how-to-add-a-featured-image",
    title: "How to add a featured image to a post",
    categorySlug: "tutorials",
    image: "/uploads/demo-tutorial-featured.jpg",
    body: `Follow these steps in the admin console:

1. Open Media Library → Choose File → Upload.
2. Copy the file URL (starts with /uploads/…).
3. Open Content → New draft (or Edit).
4. Under Featured image, paste the URL — or click “Pick from Media Library”.
5. Save draft → Publish from the content list.

The public /posts page shows the image on the card and on the post detail page.`,
  },
  {
    slug: "breaking-public-api-only-shows-published",
    title: "Live: Public API only returns published posts",
    categorySlug: "live-news",
    image: "/uploads/demo-live-news-api.jpg",
    body: `Security note for reviewers: GET /api/public/posts never returns drafts.

If a post is draft or unpublished, it disappears from the public site immediately — while editors can still open it in Admin.

This is the core CMS trust boundary: public routes filter status = 'published'.`,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(
      `INSERT INTO categories (name, slug, description)
       VALUES ('Live News', 'live-news', 'Breaking updates and live coverage')
       ON CONFLICT (slug) DO NOTHING`
    );

    const authorRes = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM users
       WHERE email IN ('sarah@technova.com', 'jaseem@technova.com')
       ORDER BY CASE WHEN email = 'sarah@technova.com' THEN 0 ELSE 1 END
       LIMIT 1`
    );
    const author = authorRes.rows[0];
    if (!author) {
      console.error("No author user found. Register sarah@technova.com first.");
      process.exit(1);
    }

    const cats = await pool.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM categories`
    );
    const catBySlug = new Map(cats.rows.map((c) => [c.slug, c.id]));

    for (const post of DEMO_POSTS) {
      const categoryId = catBySlug.get(post.categorySlug);
      if (!categoryId) {
        console.warn(`Skip ${post.slug}: category ${post.categorySlug} missing`);
        continue;
      }

      const upsert = await pool.query<{ id: string }>(
        `INSERT INTO content (
           title, slug, body, status, author_id, featured_image_url, published_at
         ) VALUES ($1, $2, $3, 'published', $4, $5, NOW())
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           status = 'published',
           featured_image_url = EXCLUDED.featured_image_url,
           published_at = COALESCE(content.published_at, NOW()),
           updated_at = NOW()
         RETURNING id`,
        [post.title, post.slug, post.body, author.id, post.image]
      );

      const contentId = upsert.rows[0]?.id;
      if (!contentId) continue;

      await pool.query(
        `DELETE FROM content_categories WHERE content_id = $1`,
        [contentId]
      );
      await pool.query(
        `INSERT INTO content_categories (content_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [contentId, categoryId]
      );

      console.log(`✓ ${post.categorySlug}: ${post.title}`);
    }

    console.log(`\nDone. Author: ${author.name}`);
    console.log("Next: npm run db:fix-demo-images  (downloads local images)");
    console.log("Then open http://localhost:5000/posts");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
