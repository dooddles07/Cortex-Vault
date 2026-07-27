"use client";

import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CitationPane, type Source } from "@/components/citation-pane";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Segmented, type Segment } from "@/components/ui/segmented";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNote } from "@/components/ui/states";
import { api, type SearchHit } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { DURATION, EASE, STAGGER } from "@/lib/motion";

type Mode = "hybrid" | "semantic" | "keyword";

const MODES: readonly Segment<Mode>[] = [
  { id: "hybrid", label: "Hybrid", hint: "Meaning and keywords, fused and re-ranked" },
  { id: "semantic", label: "Semantic", hint: "Meaning only" },
  { id: "keyword", label: "Keyword", hint: "Exact terms only" },
] as const;

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchScreen />
    </Suspense>
  );
}

function SearchScreen() {
  const user = useRequireAuth();
  const params = useSearchParams();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("hybrid");
  const [asked, setAsked] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [source, setSource] = useState<Source | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const requestId = useRef(0);

  const run = useCallback(
    async (q: string, searchMode: Mode) => {
      if (!q) return;
      const id = ++requestId.current;
      setBusy(true);
      setError(null);
      setAsked(q);
      try {
        const result = await api.search(q, searchMode);
        if (id !== requestId.current) return; // a newer search already landed
        setHits(result.hits);
        setActive(0);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (id === requestId.current) setBusy(false);
      }
    },
    [],
  );

  // The command palette hands off here with ?q=
  useEffect(() => {
    const initial = params.get("q");
    if (!initial || !user) return;
    setQuery(initial);
    void run(initial, "hybrid");
  }, [params, user, run]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!hits?.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter" && hits[active]) {
      event.preventDefault();
      openHit(hits[active]!);
    }
  }

  function openHit(hit: SearchHit) {
    setSource({
      documentId: hit.document_id,
      documentTitle: hit.document_title,
      chunkId: hit.chunk_id,
      excerpt: hit.content,
    });
  }

  useEffect(() => {
    list.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!user) return null;

  return (
    <AppShell title="Search">
      {/* Padding, not margin: w-full resolves against the content box, so only
          padding actually narrows the results column to clear the pane. */}
      <div className={cn("w-full", source && "lg:pr-(--layout-source-pane)")}>
        <div className="mx-auto flex w-full max-w-(--layout-content-max) flex-col gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(query.trim(), mode);
          }}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon
                of={SearchIcon}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-icon-subtle"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search everything in your vault…"
                aria-label="Search your vault"
                className="h-12 w-full rounded-md border border-border-interactive bg-surface pl-11 pr-4 text-body text-fg transition-[border-color] duration-(--duration-fast) placeholder:text-fg-subtle hover:border-border-strong"
              />
            </div>
            <Button type="submit" size="lg" loading={busy} disabled={!query.trim()}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              segments={MODES}
              value={mode}
              onChange={(next) => {
                setMode(next);
                if (asked) void run(asked, next);
              }}
              label="Search mode"
            />
            {hits && !busy && (
              <p className="tabular text-caption text-fg-subtle">
                {hits.length} {hits.length === 1 ? "match" : "matches"} for “{asked}”
                <span className="hidden sm:inline"> · ↑ ↓ to move, Enter to open</span>
              </p>
            )}
          </div>
        </form>

        {error && <ErrorNote message={error} />}
        {busy && <ListSkeleton rows={4} />}

        {hits?.length === 0 && !busy && (
          <EmptyState
            title="No matches"
            body={
              mode === "keyword"
                ? "Keyword mode needs the exact terms. Switch to Hybrid to match on meaning as well."
                : "Nothing in your vault matched that. Try different wording, or switch to Keyword for exact terms."
            }
          />
        )}

        {hits && hits.length > 0 && !busy && (
          <ul ref={list} className="flex flex-col gap-3">
            {hits.map((hit, i) => (
              <motion.li
                key={hit.chunk_id}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduced ? DURATION.instant : DURATION.base,
                  ease: EASE.out,
                  delay: reduced ? 0 : Math.min(i, 8) * STAGGER,
                }}
              >
                <button
                  type="button"
                  data-active={i === active}
                  onClick={() => openHit(hit)}
                  onPointerMove={() => setActive(i)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-lg border bg-surface p-4 text-left transition-colors duration-(--duration-fast) ease-(--ease-standard)",
                    i === active
                      ? "border-border-interactive bg-surface-raised"
                      : "border-border hover:bg-surface-raised",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-label text-fg">
                      {hit.document_title}
                    </span>
                    {/* Score is a fused rank, not a percentage - label it honestly. */}
                    <span className="tabular shrink-0 text-citation text-fg-subtle">
                      rank {hit.score.toFixed(4)}
                    </span>
                  </div>
                  <p className="measure text-body-sm text-fg-muted">
                    <Highlight text={hit.content} terms={asked} />
                  </p>
                </button>
              </motion.li>
            ))}
            </ul>
          )}
        </div>
      </div>

      <CitationPane source={source} onClose={() => setSource(null)} />
    </AppShell>
  );
}

/**
 * Marks the query's own words in a snippet. Semantic hits often match without
 * containing the terms at all, which is exactly when seeing that is useful.
 */
function Highlight({ text, terms }: { text: string; terms: string }) {
  const words = terms
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return <>{text}</>;

  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );

  return (
    <>
      {text.split(pattern).map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded-xs bg-tint-accent text-on-tint-accent">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
