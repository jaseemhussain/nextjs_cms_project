"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FeaturedImageField } from "@/components/admin/FeaturedImageField";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ContentDetail = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: "draft" | "published" | "archived";
  featured_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  categories: Category[];
};

type SeoFields = Pick<
  ContentDetail,
  "meta_title" | "meta_description" | "og_image_url" | "canonical_url"
>;

export default function EditContentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [seoInitial, setSeoInitial] = useState<SeoFields | null>(null);
  const [status, setStatus] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [contentRes, categoriesRes] = await Promise.all([
          apiClient<{ content: ContentDetail }>(`/api/content/${id}`),
          apiClient<{ categories: Category[] }>("/api/categories"),
        ]);

        const content = contentRes.content;
        setTitle(content.title);
        setSlug(content.slug);
        setBody(content.body);
        setFeaturedImageUrl(content.featured_image_url ?? "");
        setSeoInitial({
          meta_title: content.meta_title,
          meta_description: content.meta_description,
          og_image_url: content.og_image_url,
          canonical_url: content.canonical_url,
        });
        setStatus(content.status);
        setSelectedIds(content.categories.map((c) => c.id));
        setCategories(categoriesRes.categories);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  function toggleCategory(categoryId: string) {
    setSelectedIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((x) => x !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient(`/api/content/${id}`, {
        method: "PATCH",
        body: {
          title,
          slug,
          body,
          categoryIds: selectedIds,
          featuredImageUrl: featuredImageUrl.trim() || null,
        },
      });
      router.push("/admin/content");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/content"
        className="text-sm font-semibold text-muted hover:text-foreground"
      >
        ← Back to content
      </Link>

      <div className="mt-4">
        <PageHeader
          eyebrow="Edit"
          title="Update content"
          description={
            status === "published"
              ? "Published — changes appear on the public site immediately."
              : "Draft — publish from the content list when ready."
          }
        />
      </div>

      <Panel className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold">Slug (URL)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
              required
            />
            <span className="mt-1 block text-xs text-muted">
              Changing a published slug can break old links.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
            />
          </label>

          <FeaturedImageField
            value={featuredImageUrl}
            onChange={setFeaturedImageUrl}
          />

          <fieldset className="text-sm">
            <legend className="mb-2 font-semibold">Categories</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <Alert>{error}</Alert> : null}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Panel>

      {seoInitial ? (
        <div className="mt-6">
          <SeoPanel
            contentId={id}
            post={{
              title,
              slug,
              body,
              featured_image_url: featuredImageUrl.trim() || null,
            }}
            initial={seoInitial}
          />
        </div>
      ) : null}
    </div>
  );
}
