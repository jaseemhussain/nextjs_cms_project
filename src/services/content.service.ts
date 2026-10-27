import {
  getCategoriesForContentIds,
  setContentCategories,
} from "@/db/queries/categories.queries";
import {
  createContent,
  deleteContentById,
  findContentById,
  findContentBySlug,
  findContentWithAuthorById,
  findPublishedBySlug,
  listContentPage,
  publishContent,
  unpublishContent,
  updateContent,
} from "@/db/queries/content.queries";
import { withTransaction } from "@/lib/db/transaction";
import { slugify } from "@/lib/slugify";
import { diffChanges, logActivity } from "@/services/activity.service";
import type { ActivityActor } from "@/types/activity";
import type {
  Content,
  ContentStatus,
  ContentWithAuthor,
  ContentWithCategories,
} from "@/types/content";
import type { PaginationMeta } from "@/types/pagination";
import type { PublicUser } from "@/types/user";

export class ContentError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ContentError";
  }
}

const DEFAULT_PAGE_SIZE = 3;

function normalizePage(page?: number, pageSize?: number) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(
    50,
    Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)
  );
  return { page: safePage, pageSize: safeSize };
}

async function ensureUniqueSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let candidate = baseSlug || "untitled";
  let suffix = 2;

  while (true) {
    const existing = await findContentBySlug(candidate);
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function withCategories(
  items: ContentWithAuthor[]
): Promise<ContentWithCategories[]> {
  const map = await getCategoriesForContentIds(items.map((item) => item.id));
  return items.map((item) => ({
    ...item,
    categories: map.get(item.id) ?? [],
  }));
}

async function withCategoriesOne(
  item: ContentWithAuthor
): Promise<ContentWithCategories> {
  const [enriched] = await withCategories([item]);
  return enriched!;
}

export async function createDraft(
  author: PublicUser,
  input: {
    title: string;
    body?: string;
    slug?: string;
    categoryIds?: string[];
    featuredImageUrl?: string | null;
  }
): Promise<ContentWithCategories> {
  const title = input.title?.trim();
  if (!title) {
    throw new ContentError("title is required", 400);
  }

  return withTransaction(async () => {
    const baseSlug = slugify(input.slug?.trim() || title);
    const slug = await ensureUniqueSlug(baseSlug);

    const content = await createContent({
      title,
      slug,
      body: input.body ?? "",
      authorId: author.id,
      featuredImageUrl: input.featuredImageUrl?.trim() || null,
    });

    if (input.categoryIds && input.categoryIds.length > 0) {
      await setContentCategories(content.id, input.categoryIds);
    }

    const withAuthor = await findContentWithAuthorById(content.id);
    if (!withAuthor) {
      throw new ContentError("Content not found", 404);
    }

    const created = await withCategoriesOne(withAuthor);

    await logActivity(author, {
      action: "content.create",
      entityType: "content",
      entityId: created.id,
      entityLabel: created.title,
      changes: diffChanges({}, snapshotForLog(created), LOGGED_CONTENT_FIELDS),
    });

    return created;
  });
}

const LOGGED_CONTENT_FIELDS = [
  "title",
  "slug",
  "body",
  "featured_image_url",
  "categories",
];

function snapshotForLog(item: ContentWithCategories): Record<string, unknown> {
  return {
    title: item.title,
    slug: item.slug,
    body: item.body,
    featured_image_url: item.featured_image_url,
    categories: item.categories.map((c) => c.name),
  };
}

export async function getAdminContentList(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: ContentStatus;
}): Promise<{ items: ContentWithCategories[] } & PaginationMeta> {
  const { page, pageSize } = normalizePage(options?.page, options?.pageSize);
  const result = await listContentPage({
    status: options?.status,
    search: options?.search,
    page,
    pageSize,
  });

  const items = await withCategories(result.items);
  const totalPages =
    result.total === 0 ? 0 : Math.ceil(result.total / pageSize);

  return {
    items,
    page,
    pageSize,
    total: result.total,
    totalPages,
  };
}

export async function getAdminContentById(
  id: string
): Promise<ContentWithCategories> {
  const withAuthor = await findContentWithAuthorById(id);
  if (!withAuthor) {
    throw new ContentError("Content not found", 404);
  }
  return withCategoriesOne(withAuthor);
}

export async function updateDraft(
  actor: ActivityActor,
  id: string,
  input: {
    title?: string;
    body?: string;
    slug?: string;
    categoryIds?: string[];
    featuredImageUrl?: string | null;
  }
): Promise<ContentWithCategories> {
  return withTransaction(async () => {
    const before = await getAdminContentById(id);

    let nextSlug: string | undefined;
    // Slug tabhi change jab explicitly bheja ho (published URL accidentally mat todo)
    if (input.slug !== undefined) {
      const base = slugify(input.slug.trim() || before.title);
      nextSlug = await ensureUniqueSlug(base, id);
    }

    const updated = await updateContent(id, {
      title: input.title?.trim(),
      body: input.body,
      slug: nextSlug,
      featuredImageUrl: input.featuredImageUrl,
    });

    if (!updated) {
      throw new ContentError("Content not found", 404);
    }

    if (input.categoryIds !== undefined) {
      await setContentCategories(id, input.categoryIds);
    }

    const after = await getAdminContentById(id);
    const changes = diffChanges(
      snapshotForLog(before),
      snapshotForLog(after),
      LOGGED_CONTENT_FIELDS
    );

    if (changes) {
      await logActivity(actor, {
        action: "content.update",
        entityType: "content",
        entityId: id,
        entityLabel: after.title,
        changes,
      });
    }

    return after;
  });
}

export async function publishDraft(
  actor: ActivityActor,
  id: string
): Promise<Content> {
  return withTransaction(async () => {
    const existing = await findContentById(id);
    if (!existing) {
      throw new ContentError("Content not found", 404);
    }

    if (existing.status === "published") {
      return existing;
    }

    const published = await publishContent(id);
    if (!published) {
      throw new ContentError("Content not found", 404);
    }

    await logActivity(actor, {
      action: "content.publish",
      entityType: "content",
      entityId: id,
      entityLabel: published.title,
      changes: { status: { from: existing.status, to: "published" } },
    });

    return published;
  });
}

export async function revertToDraft(
  actor: ActivityActor,
  id: string
): Promise<Content> {
  return withTransaction(async () => {
    const existing = await findContentById(id);
    if (!existing) {
      throw new ContentError("Content not found", 404);
    }

    if (existing.status === "draft") {
      return existing;
    }

    const draft = await unpublishContent(id);
    if (!draft) {
      throw new ContentError("Content not found", 404);
    }

    await logActivity(actor, {
      action: "content.unpublish",
      entityType: "content",
      entityId: id,
      entityLabel: draft.title,
      changes: { status: { from: existing.status, to: "draft" } },
    });

    return draft;
  });
}

export async function deleteContent(
  actor: ActivityActor,
  id: string
): Promise<void> {
  await withTransaction(async () => {
    const existing = await findContentById(id);
    if (!existing) {
      throw new ContentError("Content not found", 404);
    }

    const ok = await deleteContentById(id);
    if (!ok) {
      throw new ContentError("Content not found", 404);
    }

    // The row is gone after this, so the log keeps a snapshot of what it was.
    await logActivity(actor, {
      action: "content.delete",
      entityType: "content",
      entityId: id,
      entityLabel: existing.title,
      changes: {
        slug: { from: existing.slug, to: null },
        status: { from: existing.status, to: null },
      },
    });
  });
}

/** Public site — drafts NEVER returned */
export async function getPublicPosts(options?: {
  categorySlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ContentWithCategories[] } & PaginationMeta> {
  const { page, pageSize } = normalizePage(options?.page, options?.pageSize);
  const result = await listContentPage({
    status: "published",
    search: options?.search,
    categorySlug: options?.categorySlug,
    page,
    pageSize,
  });

  const items = await withCategories(result.items);
  const totalPages =
    result.total === 0 ? 0 : Math.ceil(result.total / pageSize);

  return {
    items,
    page,
    pageSize,
    total: result.total,
    totalPages,
  };
}

export async function getPublicPostBySlug(
  slug: string
): Promise<ContentWithCategories> {
  const post = await findPublishedBySlug(slug);
  if (!post) {
    throw new ContentError("Post not found", 404);
  }
  return withCategoriesOne(post);
}
