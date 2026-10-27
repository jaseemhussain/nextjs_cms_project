import Link from "next/link";

/**
 * Public site chrome only — admin nav belongs in AdminShell sidebar.
 * Visitors should never see Content / Categories / Media / Users here.
 */
export function PublicSiteHeader() {
  return (
    <header className="border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            NovaCMS
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/posts" className="text-brand hover:text-brand-dark">
              Posts
            </Link>
          </nav>
        </div>
        <Link
          href="/admin/login"
          className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Admin login
        </Link>
      </div>
    </header>
  );
}
