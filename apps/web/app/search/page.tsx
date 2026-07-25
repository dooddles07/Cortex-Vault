"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui/states";
import { api, type SearchHit } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const MODES = [
  { id: "hybrid", label: "Hybrid", hint: "Meaning and keywords, fused" },
  { id: "semantic", label: "Semantic", hint: "Meaning only" },
  { id: "keyword", label: "Keyword", hint: "Exact terms only" },
] as const;

export default function SearchPage() {
  const user = useRequireAuth();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<string>("hybrid");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.search(query.trim(), mode);
      setHits(result.hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Search">
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6">
        <form onSubmit={onSearch} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything in your vault…"
              aria-label="Search your vault"
              className="h-12 w-full rounded-md border border-border-interactive bg-surface px-4 text-body text-fg placeholder:text-fg-subtle hover:border-border-strong"
            />
            <Button type="submit" size="lg" disabled={busy || !query.trim()}>
              {busy ? "Searching…" : "Search"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Search mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                title={m.hint}
                className={cn(
                  "min-h-11 rounded-md border px-3 text-label transition-colors duration-[--duration-fast]",
                  mode === m.id
                    ? "border-primary bg-surface-brand font-semibold text-fg"
                    : "border-border text-fg-muted hover:bg-bg-subtle hover:text-fg",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </form>

        {error && <ErrorNote message={error} />}
        {busy && <Spinner label="Searching" />}

        {hits?.length === 0 && !busy && (
          <EmptyState
            title="No matches"
            body="Nothing in your vault matched that. Try different wording, or switch to keyword mode for exact terms."
          />
        )}

        {hits && hits.length > 0 && (
          <ul className="flex flex-col gap-3">
            {hits.map((hit) => (
              <li
                key={hit.chunk_id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-label text-fg">{hit.document_title}</span>
                  {/* Score is a fused rank, not a percentage - label it honestly. */}
                  <span className="tabular shrink-0 text-caption text-fg-subtle">
                    rank {hit.score.toFixed(4)}
                  </span>
                </div>
                <p className="measure text-body-sm text-fg-muted">{hit.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
