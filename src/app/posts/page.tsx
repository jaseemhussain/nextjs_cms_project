import Link from "next/link";
import { PublicSiteHeader } from "@/components/public/PublicSiteHeader";
import { Badge } from "@/components/ui/Badge";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { getAllCategories } from "@/services/category.service";
import { getPublicPosts } from "@/services/content.service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    category?: string;
    search?: string;
    page?: string;
  }>;
};

function buildPostsHref(input: {
  page: number;
  category?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.search) params.set("search", input.search);
  if (input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/posts?${qs}` : "/posts";
}

function excerpt(body: string, max = 140) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export default async function PublicPostsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const search = params.search?.trim() || undefined;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [result, categories] = await Promise.all([
    getPublicPosts({
      categorySlug,
      search,
      page,
      pageSize: 4,
    }),
    getAllCategories(),
  ]);

  const posts = result.items;
  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f6_100%)]">
      <PublicSiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Public site
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {activeCategory
              ? activeCategory.name
              : "Stories from the team"}
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted">
            {activeCategory?.description ||
              "Only published content appears here. Drafts stay inside the admin console."}
          </p>
        </div>

        <form action="/posts" method="get" className="mb-6 flex flex-wrap gap-2">
          {categorySlug ? (
            <input type="hidden" name="category" value={categorySlug} />
          ) : null}
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search published posts…"
            className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none ring-brand/25 focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Search
          </button>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={buildPostsHref({ page: 1, search })}
            className={
              !categorySlug
                ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-slate-50"
            }
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildPostsHref({
                page: 1,
                category: category.slug,
                search,
              })}
              className={
                categorySlug === category.slug
                  ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-slate-50"
              }
            >
              {category.name}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-muted">No published posts yet.</p>
        ) : (
          <ul className="space-y-5">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-100 sm:aspect-auto sm:w-56 sm:self-stretch">
                    {post.featured_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featured_image_url}
                        alt=""
                        className="h-full min-h-[140px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full min-h-[140px] items-center justify-center bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_100%)] px-4 text-center text-sm font-semibold text-white/90">
                        NovaCMS
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    {post.categories.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {post.categories.map((cat) => (
                          <Badge key={cat.id} tone="brand">
                            {cat.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <h2 className="font-display text-2xl font-semibold text-foreground group-hover:text-brand">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {excerpt(post.body)}
                    </p>
                    <p className="mt-auto pt-4 text-xs font-medium text-muted">
                      By {post.author_name}
                      {post.published_at
                        ? ` · ${new Date(post.published_at).toLocaleDateString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <PaginationBar
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            hrefForPage={(p) =>
              buildPostsHref({
                page: p,
                category: categorySlug,
                search,
              })
            }
          />
        </div>
      </main>
    </div>
  );
}
