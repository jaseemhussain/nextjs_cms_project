import {
  createCategory,
  deleteCategory,
  findCategoryById,
  findCategoryBySlug,
  listCategories,
  updateCategory,
} from "@/db/queries/categories.queries";
import { withTransaction } from "@/lib/db/transaction";
import { slugify } from "@/lib/slugify";
import { diffChanges, logActivity } from "@/services/activity.service";
import type { ActivityActor } from "@/types/activity";
import type { Category } from "@/types/category";

const CATEGORY_FIELDS = ["name", "slug", "description"];

export class CategoryError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "CategoryError";
  }
}

async function ensureUniqueCategorySlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let candidate = baseSlug || "category";
  let suffix = 2;

  while (true) {
    const existing = await findCategoryBySlug(candidate);
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function getAllCategories(): Promise<Category[]> {
  return listCategories();
}

export async function createCategoryItem(
  actor: ActivityActor,
  input: {
    name: string;
    description?: string;
    slug?: string;
  }
): Promise<Category> {
  const name = input.name?.trim();
  if (!name) {
    throw new CategoryError("name is required", 400);
  }

  try {
    return await withTransaction(async () => {
      const baseSlug = slugify(input.slug?.trim() || name);
      const slug = await ensureUniqueCategorySlug(baseSlug);

      const category = await createCategory({
        name,
        slug,
        description: input.description?.trim() || null,
      });

      await logActivity(actor, {
        action: "category.create",
        entityType: "category",
        entityId: category.id,
        entityLabel: category.name,
        changes: diffChanges({}, category, CATEGORY_FIELDS),
      });

      return category;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("categories_name_unique")) {
      throw new CategoryError("Category name already exists", 409);
    }
    throw error;
  }
}

export async function updateCategoryItem(
  actor: ActivityActor,
  id: string,
  input: { name?: string; description?: string; slug?: string }
): Promise<Category> {
  return withTransaction(async () => {
    const existing = await findCategoryById(id);
    if (!existing) {
      throw new CategoryError("Category not found", 404);
    }

    let nextSlug: string | undefined;
    if (input.slug !== undefined || input.name !== undefined) {
      const base = slugify((input.slug ?? input.name ?? existing.name).trim());
      nextSlug = await ensureUniqueCategorySlug(base, id);
    }

    const updated = await updateCategory(id, {
      name: input.name?.trim(),
      slug: nextSlug,
      description:
        input.description !== undefined ? input.description.trim() : undefined,
    });

    if (!updated) {
      throw new CategoryError("Category not found", 404);
    }

    const changes = diffChanges(existing, updated, CATEGORY_FIELDS);
    if (changes) {
      await logActivity(actor, {
        action: "category.update",
        entityType: "category",
        entityId: id,
        entityLabel: updated.name,
        changes,
      });
    }

    return updated;
  });
}

export async function removeCategory(
  actor: ActivityActor,
  id: string
): Promise<void> {
  await withTransaction(async () => {
    const existing = await findCategoryById(id);
    if (!existing) {
      throw new CategoryError("Category not found", 404);
    }

    const ok = await deleteCategory(id);
    if (!ok) {
      throw new CategoryError("Category not found", 404);
    }

    await logActivity(actor, {
      action: "category.delete",
      entityType: "category",
      entityId: id,
      entityLabel: existing.name,
      changes: { slug: { from: existing.slug, to: null } },
    });
  });
}
