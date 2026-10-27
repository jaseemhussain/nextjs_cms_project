import { query } from "@/lib/db/query";
import type { Content, ContentStatus, ContentWithAuthor } from "@/types/content";

const CONTENT_COLUMNS = `
  c.id, c.title, c.slug, c.body, c.status, c.author_id,
  c.featured_image_url,
  c.meta_title, c.meta_description, c.og_image_url, c.canonical_url,
  c.published_at, c.created_at, c.updated_at
`;

const CONTENT_RETURNING = `
  id, title, slug, body, status, author_id, featured_image_url,
  meta_title, meta_description, og_image_url, canonical_url,
  published_at, created_at, updated_at
`;

export async function createContent(input: {
  title: string;
  slug: string;
  body: string;
  authorId: string;
  featuredImageUrl?: string | null;
}): Promise<Content> {
  const result = await query<Content>(
    `INSERT INTO content (title, slug, body, status, author_id, featured_image_url)
     VALUES ($1, $2, $3, 'draft', $4, $5)
     RETURNING ${CONTENT_RETURNING}`,
    [
      input.title,
      input.slug,
      input.body,
      input.authorId,
      input.featuredImageUrl ?? null,
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create content");
  }
  return row;
}

export async function findContentById(id: string): Promise<Content | null> {
  const result = await query<Content>(
    `SELECT ${CONTENT_RETURNING}
     FROM content
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findContentWithAuthorById(
  id: string
): Promise<ContentWithAuthor | null> {
  const result = await query<ContentWithAuthor>(
    `SELECT ${CONTENT_COLUMNS},
            u.name AS author_name,
            u.email AS author_email
     FROM content c
     INNER JOIN users u ON u.id = c.author_id
     WHERE c.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findContentBySlug(slug: string): Promise<Content | null> {
  const result = await query<Content>(
    `SELECT ${CONTENT_RETURNING}
     FROM content
     WHERE slug = $1
     LIMIT 1`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function listContent(filters?: {
  status?: ContentStatus;
}): Promise<ContentWithAuthor[]> {
  const result = await listContentPage({
    status: filters?.status,
    page: 1,
    pageSize: 1000,
  });
  return result.items;
}

export async function listContentPage(input: {
  status?: ContentStatus;
  search?: string;
  categorySlug?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: ContentWithAuthor[]; total: number }> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;
  const search = input.search?.trim() || null;
  const status = input.status ?? null;
  const categorySlug = input.categorySlug?.trim() || null;

  const where = `
    WHERE ($1::text IS NULL OR c.status = $1)
      AND (
        $2::text IS NULL
        OR c.title ILIKE '%' || $2 || '%'
        OR c.body ILIKE '%' || $2 || '%'
        OR c.slug ILIKE '%' || $2 || '%'
      )
      AND (
        $3::text IS NULL
        OR EXISTS (
          SELECT 1
          FROM content_categories cc
          INNER JOIN categories cat ON cat.id = cc.category_id
          WHERE cc.content_id = c.id
            AND cat.slug = $3
        )
      )
  `;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM content c
     ${where}`,
    [status, search, categorySlug]
  );

  const total = Number(countResult.rows[0]?.count ?? 0);

  const result = await query<ContentWithAuthor>(
    `SELECT ${CONTENT_COLUMNS},
            u.name AS author_name,
            u.email AS author_email
     FROM content c
     INNER JOIN users u ON u.id = c.author_id
     ${where}
     ORDER BY c.updated_at DESC
     LIMIT $4 OFFSET $5`,
    [status, search, categorySlug, pageSize, offset]
  );

  return { items: result.rows, total };
}

export async function listPublishedContent(): Promise<ContentWithAuthor[]> {
  return listContent({ status: "published" });
}

export async function findPublishedBySlug(
  slug: string
): Promise<ContentWithAuthor | null> {
  const result = await query<ContentWithAuthor>(
    `SELECT ${CONTENT_COLUMNS},
            u.name AS author_name,
            u.email AS author_email
     FROM content c
     INNER JOIN users u ON u.id = c.author_id
     WHERE c.slug = $1
       AND c.status = 'published'
     LIMIT 1`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function updateContent(
  id: string,
  input: {
    title?: string;
    slug?: string;
    body?: string;
    featuredImageUrl?: string | null;
  }
): Promise<Content | null> {
  const result = await query<Content>(
    `UPDATE content
     SET
       title = COALESCE($2, title),
       slug = COALESCE($3, slug),
       body = COALESCE($4, body),
       featured_image_url = CASE
         WHEN $5::boolean THEN $6
         ELSE featured_image_url
       END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${CONTENT_RETURNING}`,
    [
      id,
      input.title ?? null,
      input.slug ?? null,
      input.body ?? null,
      input.featuredImageUrl !== undefined,
      input.featuredImageUrl ?? null,
    ]
  );
  return result.rows[0] ?? null;
}

/** Saves all 4 SEO fields together; null clears a field (fallback takes over). */
export async function updateContentSeo(
  id: string,
  input: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
  }
): Promise<Content | null> {
  const result = await query<Content>(
    `UPDATE content
     SET
       meta_title = $2,
       meta_description = $3,
       og_image_url = $4,
       canonical_url = $5,
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${CONTENT_RETURNING}`,
    [
      id,
      input.metaTitle,
      input.metaDescription,
      input.ogImageUrl,
      input.canonicalUrl,
    ]
  );
  return result.rows[0] ?? null;
}

export async function publishContent(id: string): Promise<Content | null> {
  const result = await query<Content>(
    `UPDATE content
     SET
       status = 'published',
       published_at = COALESCE(published_at, NOW()),
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${CONTENT_RETURNING}`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function unpublishContent(id: string): Promise<Content | null> {
  const result = await query<Content>(
    `UPDATE content
     SET
       status = 'draft',
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${CONTENT_RETURNING}`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deleteContentById(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM content WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
