import type { CategorySummary } from "@/types/category";

export type ContentStatus = "draft" | "published" | "archived";

export type Content = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: ContentStatus;
  author_id: string;
  featured_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ContentWithAuthor = Content & {
  author_name: string;
  author_email: string;
};

export type ContentWithCategories = ContentWithAuthor & {
  categories: CategorySummary[];
};
