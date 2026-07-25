"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vault", label: "Knowledge Base" },
  { href: "/chat", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
] as const;

/** The API has no quota concept, so the sidebar shows identity rather than an
 * invented usage figure. */
function AccountFooter() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border px-2 pb-1 pt-3">
      <span className="truncate text-label text-fg">{user.name || "Signed in"}</span>
      <span className="truncate text-caption text-fg-subtle">{user.email}</span>
      <button
        type="button"
        onClick={signOut}
        className="min-h-11 self-start text-label text-fg-muted underline underline-offset-4 hover:text-fg"
      >
        Sign out
      </button>
    </div>
  );
}

export function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside
        className="sticky top-0 hidden h-dvh w-[--layout-sidebar] shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex"
        aria-label="Primary"
      >
        <Link
          href="/dashboard"
          className="mb-2 flex h-14 items-center gap-2 rounded-md px-2"
        >
          <Glyph size={28} />
          <Wordmark className="text-[1.125rem]" />
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-md px-3 text-label transition-colors duration-[--duration-fast]",
                  active
                    ? "bg-surface-brand font-semibold text-fg"
                    : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                {/* Active carries three signals: bar, tint and weight - never colour alone */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "size-4 rounded-[4px]",
                    active ? "bg-primary-fg" : "bg-icon-subtle",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />
        <AccountFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[--z-header] flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="CortexVault home"
              className="-ml-2 flex size-11 items-center justify-center rounded-md md:hidden"
            >
              <Glyph size={24} />
            </Link>
            <h1 className="truncate text-h4 text-fg">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <Link
              href="/search"
              className="hidden h-10 w-[280px] items-center justify-between rounded-md border border-border bg-bg-subtle px-3 text-body-sm text-fg-subtle lg:flex"
            >
              Search your vault
              <kbd className="rounded-sm border border-border bg-surface px-2 py-0.5 text-citation">
                Ctrl K
              </kbd>
            </Link>
            <span aria-hidden className="size-8 rounded-full bg-primary" />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>

        {/* Mobile bottom nav: 5 items max, icon + label always, safe-area inset */}
        <nav
          className="sticky bottom-0 z-[--z-header] flex items-start justify-between border-t border-border bg-surface px-2 pb-6 pt-2 md:hidden"
          aria-label="Primary"
        >
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-11 flex-1 flex-col items-center gap-1 rounded-md py-1"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-[22px] rounded-md",
                    active ? "bg-primary" : "bg-icon-subtle",
                  )}
                />
                <span
                  className={cn(
                    "text-caption",
                    active ? "font-semibold text-primary-fg" : "text-fg-subtle",
                  )}
                >
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
