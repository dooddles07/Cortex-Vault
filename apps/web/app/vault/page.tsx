import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const DOCS = [
  { name: "acme-pricing-teardown.pdf", type: "PDF", date: "2026-07-21", size: "2,481 KB" },
  { name: "retention-cohorts-2026.csv", type: "CSV", date: "2026-07-20", size: "184 KB" },
  { name: "board-update-q3.md", type: "Note", date: "2026-07-19", size: "12 KB" },
  { name: "interview-maya-pm.txt", type: "Note", date: "2026-07-18", size: "31 KB" },
  { name: "pgvector-vs-qdrant", type: "Bookmark", date: "2026-07-17", size: "8 KB" },
  { name: "ocr-scan-batch-14.pdf", type: "PDF", date: "2026-07-16", size: "9,120 KB" },
  { name: "positioning-workshop.md", type: "Note", date: "2026-07-15", size: "24 KB" },
] as const;

export default function VaultPage() {
  return (
    <AppShell
      title="Knowledge Base"
      actions={
        <>
          <Button variant="secondary" size="md">
            New note
          </Button>
          <Button size="md">Upload</Button>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6">
        <p className="text-body-sm text-fg-subtle">
          126 documents · 1,204 chunks indexed · 3 pending
        </p>

        {/* Wide content scrolls inside its own container so the page body never
            scrolls sideways at 375px. */}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">Documents in your vault</caption>
            <thead>
              <tr className="bg-bg-subtle">
                {["Name", "Type", "Modified", "Size"].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    aria-sort="none"
                    className={`px-4 py-3 text-overline text-fg-subtle ${
                      i === 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCS.map((d) => (
                <tr
                  key={d.name}
                  className="border-t border-border hover:bg-bg-subtle"
                >
                  <td className="px-4 py-3 text-body-sm text-fg">{d.name}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-muted">{d.type}</td>
                  {/* Tabular figures so live updates never shift the grid */}
                  <td className="tabular px-4 py-3 text-body-sm text-fg-muted">
                    {d.date}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-body-sm text-fg-muted">
                    {d.size}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
