"use client";

import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  FileText,
  Image as ImageIcon,
  Library,
  MessageSquare,
  NotebookPen,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ListSkeleton, StatSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNote } from "@/components/ui/states";
import { UploadButton } from "@/components/upload-button";
import { api, type DashboardSummary } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

const QUICK = [
  { href: "/vault", glyph: NotebookPen, title: "Write a note", sub: "Indexed the moment you save" },
  { href: "/vault", glyph: Upload, title: "Upload a file", sub: "PDF, Office, Markdown, images" },
  { href: "/search", glyph: Search, title: "Search your vault", sub: "Semantic and keyword" },
  { href: "/chat", glyph: MessageSquare, title: "Ask your vault", sub: "Cited answers only" },
] as const;

const STATS = [
  { key: "documents", label: "Documents", glyph: Library },
  { key: "chunks", label: "Snippets indexed", glyph: Blocks },
  { key: "conversations", label: "Conversations", glyph: MessageSquare },
] as const;

/** Icon by document type, so a list of titles is scannable at a glance. */
function typeGlyph(type: string) {
  if (/image|png|jpe?g|scan/i.test(type)) return ImageIcon;
  if (/note/i.test(type)) return NotebookPen;
  return FileText;
}

export default function DashboardPage() {
  const user = useRequireAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.summary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return null;

  const greetingName = user.name || user.email.split("@")[0];

  return (
    <AppShell title="Dashboard" actions={<UploadButton onUploaded={load} />}>
      <div className="mx-auto flex w-full max-w-(--layout-content-max) flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-h1 text-fg">Welcome back, {greetingName}</h2>
          <p className="text-body-sm text-fg-subtle">
            Everything below is drawn from your own vault.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((quick) => (
            <Link key={quick.title} href={quick.href} className="group/quick">
              <Card interactive className="flex h-full flex-col gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-tint-brand text-on-tint-brand">
                  <Icon of={quick.glyph} size={18} />
                </span>
                <span className="flex items-center gap-1.5 text-h4 text-fg">
                  {quick.title}
                  <Icon
                    of={ArrowRight}
                    size={16}
                    className="text-icon-subtle transition-transform duration-(--duration-fast) ease-(--ease-standard) group-hover/quick:translate-x-0.5"
                  />
                </span>
                <span className="text-caption text-fg-subtle">{quick.sub}</span>
              </Card>
            </Link>
          ))}
        </div>

        {error && <ErrorNote message={error} />}
        {!summary && !error && <StatSkeleton />}

        {summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <Card key={stat.key} className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-caption text-fg-subtle">
                  <Icon of={stat.glyph} size={14} className="text-icon-subtle" />
                  {stat.label}
                </span>
                <span className="tabular text-display-2 text-fg">
                  {summary[stat.key].toLocaleString()}
                </span>
              </Card>
            ))}
          </div>
        )}

        <section aria-labelledby="recent" className="flex min-w-0 flex-col gap-4">
          <h3 id="recent" className="text-h2 text-fg">
            Recent
          </h3>

          {!summary && !error && <ListSkeleton rows={4} />}

          {summary && summary.recent.length === 0 && (
            <EmptyState
              title="Your vault is empty"
              body="Add a note or upload a document, and it becomes searchable within seconds."
              action={
                <Link href="/vault">
                  <Button size="md">Add your first document</Button>
                </Link>
              }
            />
          )}

          {summary && summary.recent.length > 0 && (
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {summary.recent.map((row) => (
                <li key={row.id} className="border-b border-border last:border-b-0">
                  <Link
                    href="/vault"
                    className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-bg-subtle"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon
                        of={typeGlyph(row.type)}
                        size={16}
                        className="text-icon-subtle"
                      />
                      <span className="truncate text-label text-fg">{row.title}</span>
                    </span>
                    <span className="shrink-0 text-citation text-fg-subtle">
                      {row.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
