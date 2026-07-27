"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { LogOut, Settings, ShieldCheck } from "lucide-react";
import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/lib/auth";
import { DURATION, EASE, exitOf } from "@/lib/motion";

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const wrapper = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${user.email}`}
        className="grid size-11 place-items-center rounded-full transition-colors duration-(--duration-fast) hover:bg-bg-subtle"
      >
        <Avatar name={user.name} email={user.email} size={32} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: reduced ? 1 : 0.98,
              transition: { duration: exitOf(DURATION.base), ease: EASE.in },
            }}
            transition={{ duration: DURATION.base, ease: EASE.spring }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-(--z-popover) mt-2 flex w-[264px] flex-col gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-e3"
          >
            <div className="flex flex-col gap-0.5 px-2 py-2">
              <span className="truncate text-label text-fg">
                {user.name || "Signed in"}
              </span>
              <span className="truncate text-caption text-fg-subtle">
                {user.email}
              </span>
            </div>

            <div className="flex flex-col gap-1 px-2 pb-2">
              <span className="text-overline text-fg-subtle">Theme</span>
              <ThemeToggle />
            </div>

            <span aria-hidden className="mx-2 h-px bg-border" />

            <MenuLink href="/settings" glyph={Settings} onNavigate={() => setOpen(false)}>
              Settings
            </MenuLink>
            <MenuLink href="/settings" glyph={ShieldCheck} onNavigate={() => setOpen(false)}>
              {user.mfa_enabled ? "Two-factor is on" : "Set up two-factor"}
            </MenuLink>

            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex min-h-11 items-center gap-3 rounded-md px-2 text-label text-fg-muted transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg"
            >
              <Icon of={LogOut} size={16} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  glyph,
  onNavigate,
  children,
}: {
  href: string;
  glyph: typeof Settings;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex min-h-11 items-center gap-3 rounded-md px-2 text-label text-fg-muted transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg"
    >
      <Icon of={glyph} size={16} />
      {children}
    </Link>
  );
}
