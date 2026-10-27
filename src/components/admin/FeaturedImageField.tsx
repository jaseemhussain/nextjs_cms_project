"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

type MediaItem = {
  id: string;
  url: string;
  original_name: string;
  mime_type: string;
};

type FeaturedImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
};

/**
 * Featured image = card/hero image on public site.
 * Pick from Media Library OR paste a URL (e.g. Unsplash for demos).
 */
export function FeaturedImageField({ value, onChange }: FeaturedImageFieldProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    apiClient<{ items: MediaItem[] }>("/api/media")
      .then((data) =>
        setMedia(data.items.filter((m) => m.mime_type.startsWith("image/")))
      )
      .catch(() => undefined);
  }, []);

  return (
    <fieldset className="text-sm">
      <legend className="mb-2 font-semibold">Featured image</legend>
      <p className="mb-3 text-xs text-muted">
        Public cards aur post page pe dikhega. Pehle{" "}
        <a href="/admin/media" className="font-semibold text-brand underline">
          Media Library
        </a>{" "}
        mein upload karo, phir yahan select — ya URL paste karo.
      </p>

      {value ? (
        <div className="mb-3 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Featured preview"
            className="h-40 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2">
            <code className="truncate text-xs text-muted">{value}</code>
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 text-xs font-semibold text-red-700 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/uploads/your-file.jpg or https://…"
        className="mb-3 w-full rounded-lg border border-border px-3 py-2.5 outline-none ring-brand/25 focus:ring-2"
      />

      <button
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold hover:bg-slate-50"
      >
        {showPicker ? "Hide library" : "Pick from Media Library"}
      </button>

      {showPicker ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.length === 0 ? (
            <p className="col-span-full text-xs text-muted">
              No images yet. Upload at Media Library first.
            </p>
          ) : (
            media.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.url);
                  setShowPicker(false);
                }}
                className={`overflow-hidden rounded-lg border-2 ${
                  value === item.url
                    ? "border-brand"
                    : "border-transparent hover:border-slate-300"
                }`}
                title={item.original_name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.original_name}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
