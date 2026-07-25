"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNote, Spinner } from "@/components/ui/states";
import { UploadButton } from "@/components/upload-button";
import { api, type DashboardSummary } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

const QUICK = [
  { href: "/vault", title: "Write a note", sub: "Indexed the moment you save" },
  { href: "/vault", title: "Upload a file", sub: "PDF, Markdown, text" },
  { href: "/search", title: "Search your vault", sub: "Semantic and keyword" },
  { href: "/chat", title: "Ask your vault", sub: "Cited answers only" },
] as const;

export default function DashboardPage() {
  const user = useRequireAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.summary().then(setSummary).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  const greetingName = user.name || user.email.split("@")[0];

  return (
    <AppShell title="Dashboard" actions={<UploadButton onUploaded={() => location.reload()} />}>
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-8">
        <h2 className="text-h1 text-fg">Welcome back, {greetingName}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.title} href={q.href}>
              <Card interactive className="flex h-full flex-col gap-1">
                <span className="text-h4 text-fg">{q.title}</span>
                <span className="text-caption text-fg-subtle">{q.sub}</span>
              </Card>
            </Link>
          ))}
        </div>

        {error && <ErrorNote message={error} />}
        {!summary && !error && <Spinner label="Loading your vault" />}

        {summary && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Documents", value: summary.documents },
                { label: "Indexed chunks", value: summary.chunks },
                { label: "Conversations", value: summary.conversations },
              ].map((stat) => (
                <Card key={stat.label} className="flex flex-col gap-1">
                  <span className="tabular text-display-2 text-fg">
                    {stat.value.toLocaleString()}
                  </span>
                  <span className="text-caption text-fg-subtle">{stat.label}</span>
                </Card>
              ))}
            </div>

            <section aria-labelledby="recent" className="flex min-w-0 flex-col gap-4">
              <h3 id="recent" className="text-h2 text-fg">
                Recent
              </h3>
              {summary.recent.length === 0 ? (
                <EmptyState
                  title="Your vault is empty"
                  body="Add a note or upload a document, and it becomes searchable within seconds."
                  action={
                    <Link href="/vault">
                      <Button size="md">Add your first document</Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                  {summary.recent.map((row) => (
                    <li key={row.id} className="border-b border-border last:border-b-0">
                      <Link
                        href="/vault"
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg-subtle"
                      >
                        <span className="truncate text-label text-fg">{row.title}</span>
                        <span className="text-caption text-fg-subtle">{row.type}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
