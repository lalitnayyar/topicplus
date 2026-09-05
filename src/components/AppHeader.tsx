"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface Me {
  id: string;
  email: string;
}

const NAV_LINKS = [
  { href: "/", label: "New search" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/login");
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary-700">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-primary-foreground shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--primary-400), var(--primary-600))" }}
            aria-hidden="true"
          >
            ⚡
          </span>
          <span className="text-lg tracking-tight">TopicPulse</span>
        </Link>

        {!isAuthPage && (
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-primary-100 text-primary-700"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {me === undefined ? null : me ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-foreground-muted sm:inline">{me.email}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground-muted hover:border-primary-300 hover:text-primary-700"
              >
                Sign out
              </button>
            </div>
          ) : !isAuthPage ? (
            <Link
              href="/login"
              className="rounded-full bg-primary-500 px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-600"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
      {!isAuthPage && (
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-1.5 sm:hidden" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                pathname === link.href ? "bg-primary-100 text-primary-700" : "text-foreground-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
