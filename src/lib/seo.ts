/**
 * SEO rules shared by the admin preview (client) and the public page (server),
 * so the preview always matches what Google actually receives.
 */

export const SITE_NAME = "NovaCMS";

/** Google truncates beyond roughly these lengths. */
export const META_TITLE_RECOMMENDED = 60;
export const META_DESCRIPTION_RECOMMENDED = 160;

/** Hard limits — must match VARCHAR sizes in 009_content_seo.sql. */
export const META_TITLE_MAX = 70;
export const META_DESCRIPTION_MAX = 170;
export const URL_MAX = 500;

export type SeoSource = {
  title: string;
  slug: string;
  body: string;
  featured_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
};

export type ResolvedSeo = {
  /** Full text for <title>; already includes the site name. */
  title: string;
  description: string;
  ogImage: string | null;
  canonical: string;
  usedFallback: {
    title: boolean;
    description: boolean;
    ogImage: boolean;
    canonical: boolean;
  };
};

export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function resolveSeo(post: SeoSource): ResolvedSeo {
  const metaTitle = post.meta_title?.trim();
  const metaDescription = post.meta_description?.trim();
  const ogImage = post.og_image_url?.trim() || post.featured_image_url?.trim();
  const canonical = post.canonical_url?.trim();

  return {
    // Custom meta title is used exactly as typed; fallback gets the brand suffix.
    title: metaTitle || `${post.title} | ${SITE_NAME}`,
    description: metaDescription || excerpt(post.body),
    ogImage: ogImage || null,
    canonical: canonical || `/posts/${post.slug}`,
    usedFallback: {
      title: !metaTitle,
      description: !metaDescription,
      ogImage: !post.og_image_url?.trim(),
      canonical: !canonical,
    },
  };
}

/** Absolute http(s) URL or a site path starting with "/". */
export function isValidSeoUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Base URL used to turn "/uploads/x.jpg" into a full URL for OG tags. */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
