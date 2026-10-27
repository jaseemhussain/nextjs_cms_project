"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { clearToken, getToken } from "@/lib/auth-storage";

type MeResponse = {
  user: { name: string; email: string };
  roles: string[];
  permissions?: string[];
};

const NAV = [
  { href: "/admin/content", label: "Content", match: "/admin/content" },
  { href: "/admin/categories", label: "Categories", match: "/admin/categories" },
  { href: "/admin/media", label: "Media", match: "/admin/media" },
  { href: "/admin/users", label: "Users", match: "/admin/users" },
  { href: "/admin/activity", label: "Activity", match: "/admin/activity" },
];

/** Nav items hidden unless the user has this permission (the API enforces it too). */
const NAV_PERMISSION: Record<string, string> = {
  "/admin/users": "users.manage",
  "/admin/activity": "activity.read",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Remember which page the mobile menu was opened on, so navigating closes it.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null);
  const mobileOpen = menuOpenedOn === pathname;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    apiClient<MeResponse>("/api/auth/me")
      .then((data) => {
        setMe(data);
        setReady(true);
      })
      .catch((err: unknown) => {
        clearToken();
        if (err instanceof ApiClientError) {
          setError(err.message);
        }
        router.replace("/admin/login");
      });
  }, [router, pathname]);

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-brand/20" />
          <p className="text-sm font-medium">Preparing workspace…</p>
        </div>
      </div>
    );
  }

  const permissions = me?.permissions ?? [];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin/content" className="block">
          <p className="font-display text-xl font-semibold tracking-tight text-white">
            NovaCMS
          </p>
          <p className="mt-1 text-xs text-sidebar-text">Content operations</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-text/70">
          Workspace
        </p>
        {NAV.filter(
          (item) =>
            !NAV_PERMISSION[item.href] ||
            permissions.includes(NAV_PERMISSION[item.href])
        ).map(
          (item) => {
            const active = pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-sidebar-active"
                    : "text-sidebar-text hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          }
        )}
        <div className="pt-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-text/70">
            External
          </p>
          <Link
            href="/posts"
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text hover:bg-white/5 hover:text-white"
          >
            Public site
          </Link>
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-semibold text-white">
            {me?.user.name}
          </p>
          <p className="truncate text-xs text-sidebar-text">{me?.user.email}</p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-teal-300/90">
            {(me?.roles ?? []).join(" · ") || "no role"}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full !bg-white/10 !text-white hover:!bg-white/15"
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpenedOn(null)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
                onClick={() => setMenuOpenedOn(pathname)}
              >
                Menu
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Admin console
                </p>
                <p className="text-sm font-medium text-foreground">
                  Manage content, media, and access
                </p>
              </div>
            </div>
            <Link
              href="/posts"
              className="hidden text-sm font-semibold text-brand hover:text-brand-dark sm:inline"
            >
              Open public site →
            </Link>
          </div>
        </header>

        {error ? (
          <div className="bg-danger-soft px-4 py-2 text-center text-sm text-danger">
            {error}
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
