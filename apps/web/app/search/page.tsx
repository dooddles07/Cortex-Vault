import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const FILTERS = [
  { group: "Type", opts: ["Document 62", "Note 38", "Bookmark 19", "Snippet 7"] },
  { group: "Folder", opts: ["Research 42", "Meetings 23", "Pricing 9"] },
  { group: "Modified", opts: ["Today", "This week", "This month", "All time"] },
] as const;

const RESULTS = [
  {
    title: "ARCHITECTURE.md",
    src: "Research / Blueprint",
    tone: "accent",
    tag: "Indexed",
    snippet:
      "…chosen for zero extra infra and free-tier friendliness; accepted tradeoff is a lower recall/latency ceiling than Pinecone/Qdrant at very large scale…",
  },
  {
    title: "pgvector-vs-qdrant",
    src: "Bookmark · 2026-07-17",
    tone: "success",
    tag: "Ready",
    snippet:
      "…HNSW tuning materially improves recall above 100k vectors, but index build time grows superlinearly…",
  },
  {
    title: "Interview — Maya (PM)",
    src: "Meetings",
    tone: "success",
    tag: "Ready",
    snippet:
      "…she pushed back on swapping vector stores before we have recall numbers from real user corpora…",
  },
  {
    title: "retention-cohorts-2026.csv",
    src: "Research",
    tone: "danger",
    tag: "Failed",
    snippet:
      "…partial index: OCR failed on page 14, remaining 311 pages embedded…",
  },
] as const;

export default function SearchPage() {
  return (
    <AppShell title="Search">
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6 lg:flex-row">
        <aside
          className="flex w-full shrink-0 flex-col gap-6 lg:w-[260px]"
          aria-label="Filters"
        >
          {FILTERS.map((f) => (
            <fieldset key={f.group} className="flex flex-col gap-2">
              <legend className="mb-1 text-label text-fg">{f.group}</legend>
              {f.opts.map((o) => (
                <label
                  key={o}
                  className="flex min-h-9 cursor-pointer items-center gap-2 text-body-sm text-fg-muted"
                >
                  <input
                    type="checkbox"
                    defaultChecked={o.startsWith("Document") || o.startsWith("Research")}
                    className="size-4 cursor-pointer accent-[--primary]"
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <form role="search">
            <label htmlFor="q" className="sr-only">
              Search your vault
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue="pgvector recall"
              className="h-12 w-full rounded-md border-2 border-primary bg-surface px-4 text-body text-fg"
            />
          </form>

          <p className="tabular text-caption text-fg-subtle" aria-live="polite">
            34 results · hybrid keyword + semantic · 128ms
          </p>

          <ul className="flex flex-col gap-4">
            {RESULTS.map((r) => (
              <li key={r.title}>
                <Card interactive className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="truncate text-h4 text-fg">{r.title}</span>
                      <span className="hidden shrink-0 text-caption text-fg-subtle sm:inline">
                        {r.src}
                      </span>
                    </span>
                    <Badge tone={r.tone}>{r.tag}</Badge>
                  </div>
                  <p className="text-body-sm text-fg-muted">{r.snippet}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
