"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Library,
  MessageSquare,
  Search,
  Settings,
} from "lucide-react";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { api, type SearchHit } from "@/lib/api";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

type Row =
  | { kind: "route"; id: string; label: string; href: string; glyph: typeof Search }
  | { kind: "doc"; id: string; label: string; href: string; meta: string };

const ROUTES: Row[] = [
  { kind: "route", id: "r-dashboard", label: "Dashboard", href: "/dashboard", glyph: LayoutDashboard },
  { kind: "route", id: "r-vault", label: "Knowledge Base", href: "/vault", glyph: Library },
  { kind: "route", id: "r-chat", label: "Chat", href: "/chat", glyph: MessageSquare },
  { kind: "route", id: "r-search", label: "Search", href: "/search", glyph: Search },
  { kind: "route", id: "r-settings", label: "Settings", href: "/settings", glyph: Settings },
];

/**
 * Ctrl/Cmd K overlay. Motion is specified in docs/UI-UX.md section 5: scrim
 * 160ms, panel 0.96 -> 1 over 320ms ease-spring, exit at 65%, and the active
 * row changes background only - never transform, because a moving row under
 * arrow-key navigation is nauseating.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialog = React.useRef<HTMLDialogElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const requestId = React.useRef(0);

  const routes = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter((r) => r.label.toLowerCase().includes(q));
  }, [query]);

  const rows = React.useMemo<Row[]>(() => {
    const docs: Row[] = hits.map((hit) => ({
      kind: "doc",
      id: hit.chunk_id,
      label: hit.document_title,
      href: `/search?q=${encodeURIComponent(query.trim())}`,
      meta: hit.content.slice(0, 80).replace(/\s+/g, " ").trim(),
    }));
    return [...routes, ...docs];
  }, [routes, hits, query]);

  React.useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      setFailed(false);
      // showModal() puts focus on the dialog itself, and React's autoFocus has
      // already fired by then - claim it back for the input explicitly.
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  React.useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  // Debounced vault search. Keystrokes never fire a request on their own.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      api
        .search(q, "hybrid", 6)
        .then((result) => {
          if (id !== requestId.current) return; // a newer keystroke's search already landed
          setHits(result.hits);
          setFailed(false);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setHits([]);
          setFailed(true);
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    setActive(0);
  }, [rows.length]);

  function go(row: Row | undefined) {
    if (!row) return;
    onClose();
    router.push(row.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(rows[active]);
    }
  }

  // Keep the highlighted row in view without moving it.
  React.useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <dialog
      ref={dialog}
      aria-label="Command palette"
      className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-transparent open:size-full"
    >
      <AnimatePresence onExitComplete={() => dialog.current?.close()}>
        {open && (
          <div className="fixed inset-0 flex items-start justify-center px-4 pt-[10vh]">
            <motion.button
              type="button"
              tabIndex={-1}
              aria-label="Close command palette"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: DURATION.instant } }}
              transition={{ duration: DURATION.fast, ease: EASE.out }}
              className="absolute inset-0 cursor-default bg-(--scrim) backdrop-blur-[2px]"
            />

            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: DURATION.instant } }
                  : {
                      opacity: 0,
                      scale: 0.98,
                      transition: { duration: 0.2, ease: EASE.in },
                    }
              }
              transition={{ duration: DURATION.slow, ease: EASE.spring }}
              onKeyDown={onKeyDown}
              className="relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-e4"
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Icon of={Search} className="text-icon-subtle" />
                <label htmlFor="palette-input" className="sr-only">
                  Search your vault or jump to a screen
                </label>
                <input
                  ref={input}
                  id="palette-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your vault, or jump to a screen…"
                  className="h-14 w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
                />
                <kbd className="hidden shrink-0 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-citation text-fg-subtle sm:block">
                  Esc
                </kbd>
              </div>

              <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                {routes.length > 0 && (
                  <Group label="Go to">
                    {routes.map((row, i) => (
                      <RowButton
                        key={row.id}
                        active={active === i}
                        onSelect={() => go(row)}
                        onHover={() => setActive(i)}
                      >
                        <Icon
                          of={row.kind === "route" ? row.glyph : FileText}
                          size={16}
                          className="text-icon-subtle"
                        />
                        <span className="truncate text-label text-fg">{row.label}</span>
                      </RowButton>
                    ))}
                  </Group>
                )}

                {query.trim().length >= 2 && (
                  <Group label="In your vault">
                    {searching && (
                      <p className="px-2 py-3 text-body-sm text-fg-subtle">Searching…</p>
                    )}
                    {!searching && failed && (
                      <p className="px-2 py-3 text-body-sm text-danger">
                        Vault search is unavailable right now. Screens above still work.
                      </p>
                    )}
                    {!searching && !failed && hits.length === 0 && (
                      <p className="px-2 py-3 text-body-sm text-fg-subtle">
                        No matches. Try different wording, or open Search for keyword mode.
                      </p>
                    )}
                    {hits.map((hit, i) => {
                      // docs occupy `rows` right after `routes`, in the same
                      // order as `hits` - direct index, no re-lookup needed.
                      const rowIndex = routes.length + i;
                      const row = rows[rowIndex];
                      return (
                        <RowButton
                          key={hit.chunk_id}
                          active={active === rowIndex}
                          onSelect={() => go(row)}
                          onHover={() => setActive(rowIndex)}
                        >
                          <Icon of={FileText} size={16} className="text-icon-subtle" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-label text-fg">
                              {hit.document_title}
                            </span>
                            <span className="truncate text-caption text-fg-subtle">
                              {hit.content.slice(0, 90).replace(/\s+/g, " ").trim()}
                            </span>
                          </span>
                        </RowButton>
                      );
                    })}
                  </Group>
                )}
              </div>

              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-caption text-fg-subtle">
                <span className="flex items-center gap-1.5">
                  <Icon of={CornerDownLeft} size={12} /> open
                </span>
                <span className="hidden sm:inline">↑ ↓ move</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="px-2 py-1 text-overline text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

function RowButton({
  active,
  onSelect,
  onHover,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onSelect}
      onPointerMove={onHover}
      // Background only. A transform here would shift the row under the cursor
      // and under arrow-key navigation.
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        active ? "bg-surface-brand" : "hover:bg-bg-subtle",
      )}
    >
      {children}
    </button>
  );
}

/** Ctrl/Cmd K anywhere, plus the state the shell needs to render the overlay. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    open,
    openPalette: React.useCallback(() => setOpen(true), []),
    closePalette: React.useCallback(() => setOpen(false), []),
  };
}
