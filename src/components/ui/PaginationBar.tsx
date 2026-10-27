import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  /** Build href for a page number, e.g. (n) => `/posts?page=${n}` */
  hrefForPage: (page: number) => string;
};

export function PaginationBar({ page, totalPages, total, hrefForPage }: Props) {
  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
      <p className="text-slate-600">
        Page <span className="font-medium text-slate-900">{page}</span> of{" "}
        <span className="font-medium text-slate-900">{Math.max(totalPages, 1)}</span>
        {" · "}
        {total} total
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded border border-slate-200 px-3 py-1.5 text-slate-400">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={hrefForPage(page + 1)}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded border border-slate-200 px-3 py-1.5 text-slate-400">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
