"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";

type CategorySummary = {
  id: string;
  name: string;
  slug: string;
};

type ContentItem = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  author_name: string;
  updated_at: string;
  published_at: string | null;
  categories: CategorySummary[];
};

type ListResponse = {
  items: ContentItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 3;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const data = await apiClient<ListResponse>(
        `/api/content?${params.toString()}`
      );
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function publish(id: string) {
    setPublishingId(id);
    setError(null);
    try {
      await apiClient(`/api/content/${id}/publish`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Publish failed");
    } finally {
      setPublishingId(null);
    }
  }

  async function unpublish(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiClient(`/api/content/${id}/unpublish`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unpublish failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await apiClient(`/api/content/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Content"
        description="Create drafts, publish to the public site, and manage the full content lifecycle."
        actions={
          <Link href="/admin/content/new">
            <Button>New draft</Button>
          </Link>
        }
      />

      <form onSubmit={onSearchSubmit} className="mb-5 flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title, body, or slug…"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none ring-brand/25 focus:ring-2"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {search ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading content…</p>
      ) : items.length === 0 ? (
        <Panel className="border-dashed p-10 text-center">
          <p className="font-medium text-foreground">
            {search ? `No results for “${search}”.` : "No content yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Start with a draft, then publish when ready.
          </p>
          <Link href="/admin/content/new" className="mt-4 inline-block">
            <Button>Create first draft</Button>
          </Link>
        </Panel>
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-slate-50/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Categories</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Author</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/70 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted">/{item.slug}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.categories?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {item.categories.map((cat) => (
                            <Badge key={cat.id}>{cat.name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        tone={
                          item.status === "published"
                            ? "success"
                            : item.status === "draft"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{item.author_name}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/admin/content/${item.id}/edit`}>
                          <Button variant="secondary" className="!px-2.5 !py-1 text-xs">
                            Edit
                          </Button>
                        </Link>
                        {item.status === "draft" ? (
                          <Button
                            variant="primary"
                            className="!px-2.5 !py-1 text-xs"
                            onClick={() => publish(item.id)}
                            disabled={publishingId === item.id}
                          >
                            {publishingId === item.id ? "…" : "Publish"}
                          </Button>
                        ) : (
                          <>
                            <Link href={`/posts/${item.slug}`}>
                              <Button
                                variant="ghost"
                                className="!px-2.5 !py-1 text-xs"
                              >
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="warning"
                              className="!px-2.5 !py-1 text-xs"
                              onClick={() => unpublish(item.id)}
                              disabled={busyId === item.id}
                            >
                              Unpublish
                            </Button>
                          </>
                        )}
                        <Button
                          variant="danger"
                          className="!px-2.5 !py-1 text-xs"
                          onClick={() => remove(item.id, item.title)}
                          disabled={busyId === item.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-muted">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">
                {Math.max(totalPages, 1)}
              </span>
              {" · "}
              {total} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
