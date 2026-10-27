import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { Badge } from "@/components/ui/Badge";
import { resolveSeo, SITE_NAME } from "@/lib/seo";
import { getPublicPostBySlug } from "@/services/content.service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** generateMetadata and the page both need the post; cache runs the query once per request. */
const getPost = cache(async (slug: string) => {
  try {
    return await getPublicPostBySlug(slug);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: `Post not found | ${SITE_NAME}` };
  }

  const seo = resolveSeo(post);
  const images = seo.ogImage ? [{ url: seo.ogImage }] : undefined;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: seo.title,
      description: seo.description,
      url: `/posts/${post.slug}`,
      images,
      publishedTime: post.published_at
        ? new Date(post.published_at).toISOString()
        : undefined,
      authors: [post.author_name],
    },
    twitter: {
      card: seo.ogImage ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function PublicPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)]">
      <PublicSiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/posts"
          className="text-sm font-semibold text-muted hover:text-foreground"
        >
          ← All posts
        </Link>

        <article className="mt-6">
          {post.featured_image_url ? (
            <div className="mb-8 overflow-hidden rounded-2xl border border-border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featured_image_url}
                alt=""
                className="aspect-[21/9] w-full object-cover"
              />
            </div>
          ) : null}

          {post.categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {post.categories.map((cat) => (
                <Link key={cat.id} href={`/posts?category=${cat.slug}`}>
                  <Badge tone="brand">{cat.name}</Badge>
                </Link>
              ))}
            </div>
          )}

          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-muted">
            By {post.author_name}
            {post.published_at
              ? ` · ${new Date(post.published_at).toLocaleString()}`
              : ""}
          </p>
          <div className="mt-8 whitespace-pre-wrap text-lg leading-relaxed text-foreground/90">
            {post.body}
          </div>
        </article>
      </main>
    </div>
  );
}
