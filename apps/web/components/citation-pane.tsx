"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { api, type Document } from "@/lib/api";
import { DURATION, EASE, exitOf } from "@/lib/motion";

export type Source = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  index?: number;
  /** Exact retrieved text, when the caller has it (search results do; chat citations do not). */
  excerpt?: string;
};

/**
 * The source behind a citation. 420px right pane on desktop, full-height sheet
 * on mobile - a fixed 420px pane at 375px would scroll the page sideways.
 * Spec: docs/DESIGN.md section 7 (SourcePreviewPane).
 */
export function CitationPane({
  source,
  onClose,
}: {
  source: Source | null;
  onClose: () => void;
}) {
  const [doc, setDoc] = React.useState<Document | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const reduced = useReducedMotion();
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!source) return;
    setDoc(null);
    setError(null);
    let live = true;
    api
      .document(source.documentId)
      .then((d) => live && setDoc(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not open the source."));
    return () => {
      live = false;
    };
  }, [source]);

  React.useEffect(() => {
    if (!source) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [source, onClose]);

  return (
    <AnimatePresence>
      {source && (
        <>
          {/* Scrim only below lg, where the pane covers the content. */}
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label="Close source"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: DURATION.instant } }}
            transition={{ duration: DURATION.fast, ease: EASE.out }}
            className="fixed inset-0 z-(--z-overlay) cursor-default bg-(--scrim) lg:hidden"
          />

          <motion.aside
            aria-label={`Source: ${source.documentTitle}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: DURATION.instant } }
                : {
                    opacity: 0,
                    x: 24,
                    transition: { duration: exitOf(DURATION.slow), ease: EASE.in },
                  }
            }
            transition={{ duration: DURATION.slow, ease: EASE.spring }}
            // Below lg it is a full-height sheet over everything. At lg it sits
            // beside the content and leaves the app header reachable.
            className="fixed inset-y-0 right-0 z-(--z-drawer) flex w-full flex-col border-l border-border bg-surface shadow-e4 lg:top-16 lg:w-(--layout-source-pane)"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-overline text-fg-subtle">
                  {source.index ? `Source ${source.index}` : "Source"}
                </span>
                <h2 className="truncate text-h4 text-fg">{source.documentTitle}</h2>
                {/* Mono is reserved for machine-verifiable provenance. */}
                <span className="truncate text-citation text-fg-subtle">
                  chunk {source.chunkId.slice(0, 8)}
                </span>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close source"
                className="-m-2 grid size-11 shrink-0 place-items-center rounded-md text-icon-subtle transition-colors duration-(--duration-fast) hover:bg-bg-subtle hover:text-fg"
              >
                <Icon of={X} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {error && (
                <p role="alert" className="text-body-sm text-danger">
                  {error}
                </p>
              )}

              {source.excerpt && (
                <blockquote className="mb-4 border-l-2 border-accent bg-tint-accent p-3 text-body-sm text-fg">
                  {source.excerpt}
                </blockquote>
              )}

              {!doc && !error && (
                <p className="text-body-sm text-fg-subtle">Opening the document…</p>
              )}

              {doc && (
                <>
                  {!source.excerpt && (
                    <p className="mb-3 text-caption text-fg-subtle">
                      The API returns the chunk reference but not its offsets, so
                      the full document is shown below.
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-body-sm text-fg-muted">
                    {doc.content || "This document has no extracted text."}
                  </p>
                </>
              )}
            </div>

            <footer className="border-t border-border p-4">
              <a
                href={doc?.source_url ?? "/vault"}
                className="inline-flex min-h-11 items-center gap-2 text-label text-primary-fg underline underline-offset-4"
              >
                <Icon of={ExternalLink} size={16} />
                {doc?.source_url ? "Open original" : "Open in Knowledge Base"}
              </a>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
