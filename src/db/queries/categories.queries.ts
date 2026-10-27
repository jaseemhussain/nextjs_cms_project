import { query } from "@/lib/db/query";
import type { Category, CategorySummary } from "@/types/category";

export async function listCategories(): Promise<Category[]> {
  const result = await query<Category>(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM categories
     ORDER BY name ASC`
  );
  return result.rows;
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const result = await query<Category>(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM categories
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findCategoryBySlug(slug: string): Promise<Category | null> {
  const result = await query<Category>(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM categories
     WHERE slug = $1
     LIMIT 1`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function createCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
}): Promise<Category> {
  const result = await query<Category>(
    `INSERT INTO categories (name, slug, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug, description, created_at, updated_at`,
    [input.name, input.slug, input.description ?? null]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create category");
  }
  return row;
}

export async function updateCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
  }
): Promise<Category | null> {
  const result = await query<Category>(
    `UPDATE categories
     SET
       name = COALESCE($2, name),
       slug = COALESCE($3, slug),
       description = COALESCE($4, description),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, slug, description, created_at, updated_at`,
    [id, input.name ?? null, input.slug ?? null, input.description ?? null]
  );
  return result.rows[0] ?? null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM categories WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function setContentCategories(
  contentId: string,
  categoryIds: string[]
): Promise<void> {
  await query(`DELETE FROM content_categories WHERE content_id = $1`, [
    contentId,
  ]);

  if (categoryIds.length === 0) {
    return;
  }

  await query(
    `INSERT INTO content_categories (content_id, category_id)
     SELECT $1, c.id
     FROM categories c
     WHERE c.id = ANY($2::uuid[])`,
    [contentId, categoryIds]
  );
}

export async function getCategoriesForContentIds(
  contentIds: string[]
): Promise<Map<string, CategorySummary[]>> {
  const map = new Map<string, CategorySummary[]>();

  if (contentIds.length === 0) {
    return map;
  }

  const result = await query<{
    content_id: string;
    id: string;
    name: string;
    slug: string;
  }>(
    `SELECT cc.content_id, c.id, c.name, c.slug
     FROM content_categories cc
     INNER JOIN categories c ON c.id = cc.category_id
     WHERE cc.content_id = ANY($1::uuid[])
     ORDER BY c.name ASC`,
    [contentIds]
  );

  for (const row of result.rows) {
    const list = map.get(row.content_id) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
    map.set(row.content_id, list);
  }

  return map;
}

export async function listPublishedContentIdsByCategorySlug(
  categorySlug: string
): Promise<string[]> {
  const result = await query<{ content_id: string }>(
    `SELECT cc.content_id
     FROM content_categories cc
     INNER JOIN categories cat ON cat.id = cc.category_id
     INNER JOIN content c ON c.id = cc.content_id
     WHERE cat.slug = $1
       AND c.status = 'published'`,
    [categorySlug]
  );
  return result.rows.map((row) => row.content_id);
}
