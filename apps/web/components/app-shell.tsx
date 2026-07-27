"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import * as React from "react";
import { AccountMenu } from "@/components/account-menu";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { DURATION, EASE, SPRING } from "@/lib/motion";

const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Home", glyph: LayoutDashboard },
  { href: "/vault", label: "Knowledge Base", short: "Vault", glyph: Library },
  { href: "/chat", label: "Chat", short: "Chat", glyph: MessageSquare },
  { href: "/search", label: "Search", short: "Search", glyph: Search },
  { href: "/settings", label: "Settings", short: "Settings", glyph: Settings },
] as const;

const RAIL_KEY = "cv-rail-collapsed";

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
  const reduced = useReducedMotion();
  const { open, openPalette, closePalette } = useCommandPalette();
  const [collapsed, setCollapsed] = React.useState(false);
  const main = React.useRef<HTMLElement>(null);
  const previousPath = React.useRef(pathname);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(RAIL_KEY) === "1");
  }, []);

  const toggleRail = React.useCallback(() => {
    setCollapsed((v) => {
      localStorage.setItem(RAIL_KEY, v ? "0" : "1");
      return !v;
    });
  }, []);

  // Focus follows the route so keyboard and screen-reader users land in the new
  // content rather than back at the top of the document. Skipped on first paint.
  React.useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* The nav inside carries the accessible name; naming the aside as well
          would announce the same landmark twice under different roles. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex",
          "transition-[width] duration-(--duration-base) ease-(--ease-standard)",
          collapsed ? "w-(--layout-sidebar-collapsed)" : "w-(--layout-sidebar)",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "mb-2 flex h-14 items-center gap-2 rounded-md",
            collapsed ? "justify-center px-0" : "px-2",
          )}
        >
          <Glyph size={28} />
          {!collapsed && <Wordmark className="text-[1.125rem]" />}
          {collapsed && <span className="sr-only">CortexVault home</span>}
        </Link>

        <nav aria-label="Primary" className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 w-full items-center gap-3 rounded-md text-label transition-colors duration-(--duration-fast)",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "font-semibold text-fg"
                    : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                {/* Active carries three signals: bar, tint and weight - never colour alone */}
                {active && (
                  <motion.span
                    aria-hidden
                    layoutId="nav-active"
                    transition={reduced ? { duration: 0 } : SPRING.snappy}
                    className="absolute inset-0 rounded-md bg-surface-brand"
                  />
                )}
                {active && (
                  <motion.span
                    aria-hidden
                    layoutId="nav-bar"
                    transition={reduced ? { duration: 0 } : SPRING.snappy}
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
                  />
                )}
                <Icon
                  of={item.glyph}
                  className={cn("relative", active ? "text-primary-fg" : "text-icon")}
                />
                {!collapsed && <span className="relative">{item.label}</span>}
                {collapsed && <span className="sr-only">{item.label}</span>}
              </Link>
            );

            return (
              <React.Fragment key={item.href}>
                {collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={toggleRail}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-10 items-center gap-3 rounded-md text-label text-fg-muted transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <Icon of={collapsed ? PanelLeftOpen : PanelLeftClose} />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-(--z-header) flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-8">
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

          <div className="flex items-center gap-2">
            {actions}

            {/* Names the palette, not the act of searching - the Search screen
                already owns "Search your vault" as its own field label. */}
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette"
              className="grid size-11 place-items-center rounded-md text-icon-subtle transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg lg:hidden"
            >
              <Icon of={Search} />
            </button>

            <button
              type="button"
              onClick={openPalette}
              className="hidden h-10 w-[260px] items-center gap-2 rounded-md border border-border bg-bg-subtle px-3 text-body-sm text-fg-subtle transition-colors duration-(--duration-fast) hover:border-border-interactive hover:text-fg-muted lg:flex"
            >
              <Icon of={Search} size={16} />
              <span className="flex-1 text-left">Search or jump to…</span>
              <kbd className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-citation">
                Ctrl K
              </kbd>
            </button>

            <AccountMenu />
          </div>
        </header>

        <main
          id="main"
          ref={main}
          tabIndex={-1}
          className="flex-1 px-4 py-6 outline-none md:px-8 md:py-8"
        >
          {/* Keyed on the route so each screen enters as a unit. main itself is
              never remounted, so the landmark and its id stay stable. */}
          <motion.div
            key={pathname}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? DURATION.instant : DURATION.page,
              ease: EASE.standard,
            }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom nav: 5 items max, icon + label always, safe-area inset */}
        <nav
          aria-label="Primary"
          className="sticky bottom-0 z-(--z-header) flex items-start justify-between border-t border-border bg-surface px-2 pb-6 pt-2 md:hidden"
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
                <Icon
                  of={item.glyph}
                  size={22}
                  className={active ? "text-primary-fg" : "text-icon-subtle"}
                />
                <span
                  className={cn(
                    "text-caption",
                    active ? "font-semibold text-primary-fg" : "text-fg-subtle",
                  )}
                >
                  {item.short}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <CommandPalette open={open} onClose={closePalette} />
    </div>
  );
}
