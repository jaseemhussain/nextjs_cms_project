"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<{ categories: Category[] }>("/api/categories");
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient("/api/categories", {
        method: "POST",
        body: { name, description },
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string, categoryName: string) {
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }
    setError(null);
    try {
      await apiClient(`/api/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Taxonomy"
        title="Categories"
        description="Organize posts with labels like Blog, News, and Tutorials. One post can belong to many categories."
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <Panel className="mb-6 p-5">
        <h2 className="text-sm font-semibold text-foreground">New category</h2>
        <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none ring-brand/25 focus:ring-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none ring-brand/25 focus:ring-2"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create category"}
            </Button>
          </div>
        </form>
      </Panel>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <Panel>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50/80 text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-4 py-3 font-semibold">{category.name}</td>
                  <td className="px-4 py-3 text-muted">/{category.slug}</td>
                  <td className="px-4 py-3 text-muted">
                    {category.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="danger"
                      className="!px-2.5 !py-1 text-xs"
                      onClick={() => onDelete(category.id, category.name)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <p className="mt-4 text-sm text-muted">
        Assign categories while creating drafts in{" "}
        <Link href="/admin/content/new" className="font-semibold text-brand">
          New draft
        </Link>
        .
      </p>
    </div>
  );
}
