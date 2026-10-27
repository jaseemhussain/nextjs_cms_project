"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  META_DESCRIPTION_MAX,
  META_DESCRIPTION_RECOMMENDED,
  META_TITLE_MAX,
  META_TITLE_RECOMMENDED,
  resolveSeo,
} from "@/lib/seo";

type SeoPanelProps = {
  contentId: string;
  /** Live values from the main edit form, used for fallbacks in the preview. */
  post: {
    title: string;
    slug: string;
    body: string;
    featured_image_url: string | null;
  };
  initial: {
    meta_title: string | null;
    meta_description: string | null;
    og_image_url: string | null;
    canonical_url: string | null;
  };
};

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2 disabled:bg-slate-50 disabled:text-muted";

function Counter({
  length,
  recommended,
}: {
  length: number;
  recommended: number;
}) {
  const tone =
    length === 0
      ? "text-muted"
      : length <= recommended
        ? "text-success"
        : "text-warning";
  return (
    <span className={`text-xs font-medium ${tone}`}>
      {length}/{recommended}
      {length > recommended ? " · Google may cut this" : ""}
    </span>
  );
}

export function SeoPanel({ contentId, post, initial }: SeoPanelProps) {
  const [metaTitle, setMetaTitle] = useState(initial.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial.meta_description ?? ""
  );
  const [ogImageUrl, setOgImageUrl] = useState(initial.og_image_url ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initial.canonical_url ?? "");
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ permissions?: string[] }>("/api/auth/me")
      .then((me) => setCanEdit(me.permissions?.includes("seo.update") ?? false))
      .catch(() => setCanEdit(false));
  }, []);

  const seo = resolveSeo({
    ...post,
    meta_title: metaTitle,
    meta_description: metaDescription,
    og_image_url: ogImageUrl,
    canonical_url: canonicalUrl,
  });

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient(`/api/content/${contentId}/seo`, {
        method: "PATCH",
        body: { metaTitle, metaDescription, ogImageUrl, canonicalUrl },
      });
      setMessage("SEO saved");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "SEO save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Search & social
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">SEO</h2>
        <p className="mt-1 text-sm text-muted">
          Leave a field empty to use the fallback (title, body excerpt,
          featured image).
        </p>
      </div>

      {!canEdit ? (
        <div className="mb-4">
          <Alert tone="info">
            Read-only: your role does not have <code>seo.update</code>. Ask an
            Admin or SEO Specialist.
          </Alert>
        </div>
      ) : null}

      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Google preview
        </p>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="truncate text-xs text-slate-600">
            localhost › posts › {post.slug || "your-slug"}
          </p>
          <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">
            {seo.title}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">
            {seo.description || "No description yet — add body text or a meta description."}
          </p>
        </div>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold">Meta title</span>
            <Counter length={metaTitle.length} recommended={META_TITLE_RECOMMENDED} />
          </span>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={META_TITLE_MAX}
            placeholder={`${post.title} | NovaCMS`}
            disabled={!canEdit}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold">Meta description</span>
            <Counter
              length={metaDescription.length}
              recommended={META_DESCRIPTION_RECOMMENDED}
            />
          </span>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={META_DESCRIPTION_MAX}
            rows={3}
            placeholder="Empty = first ~155 characters of the body"
            disabled={!canEdit}
            className={inputClass}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold">OG image URL (social share)</span>
          <input
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            placeholder={post.featured_image_url || "Empty = featured image"}
            disabled={!canEdit}
            className={inputClass}
          />
          {seo.ogImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seo.ogImage}
              alt="Share preview"
              className="mt-2 h-28 w-full rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="mt-1 block text-xs text-muted">
              No image — shared links will show a text-only card.
            </span>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold">Canonical URL</span>
          <input
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder={`Empty = /posts/${post.slug}`}
            disabled={!canEdit}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted">
            Only set this if the same article is published at another URL.
          </span>
        </label>

        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        {canEdit ? (
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save SEO"}
          </Button>
        ) : null}
      </form>
    </Panel>
  );
}
