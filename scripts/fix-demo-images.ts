import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/**
 * Downloads demo images into public/uploads and points posts at local URLs.
 * Fixes broken external Unsplash links.
 */
const IMAGES: Record<string, { filename: string; source: string }> = {
  "shipping-faster-with-draft-publish": {
    filename: "demo-blog-draft-publish.jpg",
    source: "https://picsum.photos/id/0/1200/800",
  },
  "novacms-1-2-release-notes": {
    filename: "demo-news-release.jpg",
    source: "https://picsum.photos/id/180/1200/800",
  },
  "how-to-add-a-featured-image": {
    filename: "demo-tutorial-featured.jpg",
    source: "https://picsum.photos/id/201/1200/800",
  },
  "breaking-public-api-only-shows-published": {
    filename: "demo-live-news-api.jpg",
    source: "https://picsum.photos/id/1015/1200/800",
  },
};

async function download(url: string, dest: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`saved ${dest} (${buf.length} bytes)`);
}

async function main() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    for (const [slug, img] of Object.entries(IMAGES)) {
      const dest = path.join(uploadsDir, img.filename);
      if (!fs.existsSync(dest)) {
        await download(img.source, dest);
      } else {
        console.log(`exists ${img.filename}`);
      }

      const url = `/uploads/${img.filename}`;
      const result = await pool.query(
        `UPDATE content
         SET featured_image_url = $1, updated_at = NOW()
         WHERE slug = $2
         RETURNING title`,
        [url, slug]
      );

      if (result.rowCount) {
        console.log(`linked ${slug} -> ${url}`);
      } else {
        console.warn(`no post for slug ${slug}`);
      }
    }

    // Soft-hide old messy test posts from public by unpublishing non-demo drafts titles
    const cleanup = await pool.query(
      `UPDATE content
       SET status = 'draft', updated_at = NOW()
       WHERE status = 'published'
         AND slug NOT IN (
           'shipping-faster-with-draft-publish',
           'novacms-1-2-release-notes',
           'how-to-add-a-featured-image',
           'breaking-public-api-only-shows-published'
         )
       RETURNING title, slug`
    );
    for (const row of cleanup.rows) {
      console.log(`unpublished old: ${row.title} (${row.slug})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
