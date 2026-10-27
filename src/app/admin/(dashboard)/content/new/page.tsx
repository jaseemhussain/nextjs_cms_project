"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FeaturedImageField } from "@/components/admin/FeaturedImageField";
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

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient<{ categories: Category[] }>("/api/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => undefined);
  }, []);

  function toggleCategory(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient("/api/content", {
        method: "POST",
        body: {
          title,
          body,
          categoryIds: selectedIds,
          featuredImageUrl: featuredImageUrl.trim() || null,
        },
      });
      router.push("/admin/content");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
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
          eyebrow="Compose"
          title="New draft"
          description="Save as draft, attach a featured image from Media, then publish from the content list."
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

          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save draft"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
