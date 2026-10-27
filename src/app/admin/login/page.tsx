"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { setToken } from "@/lib/auth-storage";

type LoginResponse = {
  message: string;
  token: string;
  user: { name: string; email: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient<LoginResponse>("/api/auth/login", {
        auth: false,
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      router.replace("/admin/content");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(15,118,110,0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(148,163,184,0.12),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-lg text-white lg:flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/90">
            NovaCMS
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            Run your content like a product team.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Draft, review, publish, media, and role-based access — built with
            PostgreSQL and clean architecture.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>RBAC: Admin / Editor / Viewer</li>
            <li>Draft → Publish workflow</li>
            <li>Media library + categories + search</li>
          </ul>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl lg:flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Admin access
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Use your CMS account to open the console.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 outline-none ring-brand/30 focus:ring-2"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 outline-none ring-brand/30 focus:ring-2"
                required
              />
            </label>

            {error ? <Alert>{error}</Alert> : null}

            <Button type="submit" disabled={loading} className="w-full py-2.5">
              {loading ? "Signing in…" : "Continue to console"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/posts" className="font-semibold text-brand hover:text-brand-dark">
              View public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
