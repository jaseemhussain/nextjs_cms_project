"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";

type ActivityItem = {
  id: string;
  actor_id: string | null;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
};

type ListResponse = {
  items: ActivityItem[];
  actorEmails: string[];
  page: number;
  total: number;
  totalPages: number;
};

const ACTION_LABELS: Record<string, string> = {
  "content.create": "created",
  "content.update": "edited",
  "content.publish": "published",
  "content.unpublish": "unpublished",
  "content.delete": "deleted",
  "content.seo_update": "updated SEO of",
  "media.upload": "uploaded",
  "media.delete": "deleted",
  "user.create": "created user",
  "user.roles_update": "changed roles of",
  "category.create": "created category",
  "category.update": "edited category",
  "category.delete": "deleted category",
};

function actionTone(action: string): "success" | "warning" | "brand" | "neutral" {
  if (action.endsWith(".delete")) return "warning";
  if (action.endsWith(".publish") || action.endsWith(".create") || action === "media.upload") {
    return "success";
  }
  if (action.startsWith("user.")) return "brand";
  return "neutral";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const ENTITY_FILTERS = [
  { value: "", label: "All types" },
  { value: "content", label: "Content" },
  { value: "media", label: "Media" },
  { value: "user", label: "Users" },
  { value: "category", label: "Categories" },
];

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [actorEmails, setActorEmails] = useState<string[]>([]);
  const [entityType, setEntityType] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (entityType) params.set("entityType", entityType);
    if (actor) params.set("actor", actor);

    apiClient<ListResponse>(`/api/activity?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setActorEmails(data.actorEmails);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : "Failed to load activity");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Ignore a slow old response if the filters changed meanwhile.
    return () => {
      cancelled = true;
    };
  }, [page, entityType, actor]);

  function changeFilters(next: { entityType?: string; actor?: string; page?: number }) {
    setLoading(true);
    if (next.entityType !== undefined) setEntityType(next.entityType);
    if (next.actor !== undefined) setActor(next.actor);
    setPage(next.page ?? 1);
  }

  const selectClass =
    "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand/25 focus:ring-2";

  return (
    <div>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity"
        description="Who did what, and when. Entries are permanent: nobody can edit or delete them, Admins included."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <select
          value={entityType}
          onChange={(e) => changeFilters({ entityType: e.target.value })}
          className={selectClass}
        >
          {ENTITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={actor}
          onChange={(e) => changeFilters({ actor: e.target.value })}
          className={selectClass}
        >
          <option value="">Everyone</option>
          {actorEmails.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading activity…</p>
      ) : items.length === 0 ? (
        <Panel className="border-dashed p-10 text-center">
          <p className="font-medium text-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted">
            Create, edit, publish, or delete something and it will show up here.
          </p>
        </Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{item.actor_email}</span>{" "}
                    <span className="text-muted">
                      {ACTION_LABELS[item.action] ?? item.action}
                    </span>{" "}
                    <span className="font-semibold">
                      {item.entity_label ?? item.entity_id ?? "—"}
                    </span>
                  </p>
                  <time className="text-xs text-muted">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone={actionTone(item.action)}>{item.action}</Badge>
                  {item.actor_id === null ? (
                    <Badge>user deleted</Badge>
                  ) : null}
                </div>

                {item.changes ? (
                  <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    {Object.entries(item.changes).map(([field, change]) => (
                      <div key={field} className="flex flex-wrap gap-x-2">
                        <dt className="font-semibold text-foreground">{field}</dt>
                        <dd className="text-muted">
                          <span className="line-through decoration-slate-300">
                            {formatValue(change.from)}
                          </span>
                          {" → "}
                          <span className="text-foreground">{formatValue(change.to)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-muted">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{Math.max(totalPages, 1)}</span>
              {" · "}
              {total} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => changeFilters({ page: Math.max(1, page - 1) })}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => changeFilters({ page: page + 1 })}
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
