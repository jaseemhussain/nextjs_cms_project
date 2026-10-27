"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { ApiClientError } from "@/lib/api-client";
import { getToken } from "@/lib/auth-storage";

type MediaItem = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  uploader_name: string;
  created_at: string;
};

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new ApiClientError("Not logged in", 401);
      }

      const response = await fetch("/api/media", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as {
        message?: string;
        items?: MediaItem[];
      };

      if (!response.ok) {
        throw new ApiClientError(
          data.message ?? "Failed to load media",
          response.status
        );
      }

      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const token = getToken();

    if (!token) {
      setError("Not logged in");
      setUploading(false);
      return;
    }

    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new ApiClientError(data.message ?? "Upload failed", response.status);
      }

      form.reset();
      setSelectedName(null);
      setMessage("Upload successful");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) {
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Not logged in");
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new ApiClientError(data.message ?? "Delete failed", response.status);
      }

      setMessage("Deleted");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Delete failed");
    }
  }

  async function copyUrl(url: string) {
    try {
      const absolute = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(absolute);
      setMessage(`Copied: ${absolute}`);
    } catch {
      setMessage(url);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Assets"
        title="Media library"
        description="Upload images and PDFs to disk with database metadata. Copy URLs into post bodies."
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-4">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}

      <Panel className="mb-6 p-5">
        <h2 className="text-sm font-semibold">Upload file</h2>
        <p className="mt-1 text-xs text-muted">
          JPEG, PNG, WebP, GIF, PDF · Max 5MB · Requires media.upload
        </p>

        <form onSubmit={onUpload} className="mt-4 space-y-4">
          <div className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Step 1 — choose a file
            </p>
            <input
              id="media-file-input"
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              required
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectedName(file ? file.name : null);
              }}
            />
            <label htmlFor="media-file-input">
              <span className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Choose File / Browse
              </span>
            </label>
            <p className="mt-3 text-sm text-muted">
              {selectedName ? (
                <>
                  Selected:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedName}
                  </span>
                </>
              ) : (
                "No file selected yet"
              )}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Step 2 — upload</p>
            <Button type="submit" variant="secondary" disabled={uploading || !selectedName}>
              {uploading ? "Uploading…" : "Upload to library"}
            </Button>
          </div>
        </form>
      </Panel>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <Panel className="border-dashed p-10 text-center text-muted">
          No media yet. Upload your first image.
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Panel key={item.id}>
              <div className="flex h-44 items-center justify-center bg-slate-50">
                {item.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.original_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-muted">PDF</span>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-semibold" title={item.original_name}>
                    {item.original_name}
                  </p>
                  <p className="text-xs text-muted">
                    {(item.size_bytes / 1024).toFixed(1)} KB · {item.uploader_name}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() => copyUrl(item.url)}
                  >
                    Copy URL
                  </Button>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <Button type="button" variant="ghost" className="!px-2.5 !py-1 text-xs">
                      Open
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="danger"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() => onDelete(item.id, item.original_name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
