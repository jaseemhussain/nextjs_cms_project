import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1220] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.4),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/90">
          NovaCMS
        </p>
        <h1 className="font-display mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
          A production-style CMS.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
          {/* Next.js + PostgreSQL + RBAC + draft/publish + media + categories —
          built module by module with clean architecture. */}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/login"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Open admin console
          </Link>
          <Link
            href="/posts"
            className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5"
          >
            View public site
          </Link>
        </div>
      </div>
    </main>
  );
}
