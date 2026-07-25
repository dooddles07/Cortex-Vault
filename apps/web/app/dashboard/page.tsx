import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const QUICK = [
  { title: "Upload", sub: "PDF, DOCX, images" },
  { title: "Write a note", sub: "Markdown, autosaved" },
  { title: "Save a bookmark", sub: "Fetch and clean a URL" },
  { title: "Ask your vault", sub: "Cited answers only" },
] as const;

const ACTIVITY = [
  {
    name: "acme-pricing-teardown.pdf",
    meta: "Indexed · 312 pages · 2h ago",
    tone: "success",
    tag: "Ready",
  },
  { name: "Board update Q3", meta: "Note edited · 4h ago", tone: "neutral", tag: "Draft" },
  {
    name: "Retention cohorts 2026",
    meta: "Uploaded · OCR failed on p.14 · 6h ago",
    tone: "danger",
    tag: "Failed",
  },
  {
    name: "pgvector vs Qdrant",
    meta: "Bookmark saved · yesterday",
    tone: "success",
    tag: "Ready",
  },
  {
    name: "Interview — Maya (PM)",
    meta: "Meeting notes · yesterday",
    tone: "accent",
    tag: "Indexed",
  },
] as const;

const PINNED = [
  { title: "Pricing decision", body: "Pro is $12/mo; BYO key unlocks unlimited AI on Free." },
  { title: "Vector store", body: "pgvector at MVP; swap to Qdrant only if recall degrades." },
  { title: "Non-goal", body: "No realtime multiplayer editing until the Team plan." },
] as const;

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" actions={<Button size="md">Upload</Button>}>
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-8">
        <h2 className="text-h1 text-fg">Good morning, Brix</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((q) => (
            <Card key={q.title} interactive className="flex flex-col gap-1">
              <span className="text-h4 text-fg">{q.title}</span>
              <span className="text-caption text-fg-subtle">{q.sub}</span>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <section aria-labelledby="recent" className="flex min-w-0 flex-col gap-4">
            <h3 id="recent" className="text-h2 text-fg">
              Recent activity
            </h3>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {ACTIVITY.map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0 hover:bg-bg-subtle"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-label text-fg">{row.name}</span>
                    <span className="truncate text-caption text-fg-subtle">
                      {row.meta}
                    </span>
                  </span>
                  <Badge tone={row.tone}>{row.tag}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pinned" className="flex flex-col gap-4">
            <h3 id="pinned" className="text-h2 text-fg">
              Pinned memories
            </h3>
            {PINNED.map((p) => (
              <div
                key={p.title}
                className="flex flex-col gap-1 rounded-lg bg-surface-brand p-4"
              >
                <span className="text-label text-primary-fg">{p.title}</span>
                <span className="text-body-sm text-fg">{p.body}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
