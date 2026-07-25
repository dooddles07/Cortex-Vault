"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { EmptyState, ErrorNote, Spinner, ingestLabel } from "@/components/ui/states";
import { UploadButton } from "@/components/upload-button";
import { api, type Document } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

export default function VaultPage() {
  const user = useRequireAuth();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .documents({ limit: 50 })
      .then((page) => setDocuments(page.items))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createDocument({ title: title.trim(), content: content.trim(), type: "note" });
      setTitle("");
      setContent("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function onTrash(id: string) {
    await api.trashDocument(id);
    load();
  }

  if (!user) return null;

  return (
    <AppShell title="Knowledge Base" actions={<UploadButton onUploaded={load} />}>
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-8">
        <form
          onSubmit={onCreate}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="text-h3 text-fg">New note</h2>
          <Field
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is this about?"
            required
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="note-body" className="text-label text-fg">
              Content
            </label>
            <textarea
              id="note-body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Paste or write anything. It is chunked and indexed on save."
              className="w-full rounded-md border border-border-interactive bg-surface px-3 py-2 text-body text-fg placeholder:text-fg-subtle hover:border-border-strong"
            />
          </div>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-end">
            <Button type="submit" size="md" disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save note"}
            </Button>
          </div>
        </form>

        <section aria-labelledby="documents" className="flex flex-col gap-4">
          <h2 id="documents" className="text-h2 text-fg">
            Documents
          </h2>

          {!documents && !error && <Spinner label="Loading documents" />}

          {documents?.length === 0 && (
            <EmptyState
              title="Nothing stored yet"
              body="Write a note above or upload a PDF. Text is extracted, chunked and embedded automatically."
            />
          )}

          {documents && documents.length > 0 && (
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {documents.map((doc) => {
                const status = ingestLabel(doc.ingest_status);
                return (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-label text-fg">{doc.title}</span>
                      <span className="truncate text-caption text-fg-subtle">
                        {doc.type} · {new Date(doc.updated_at).toLocaleString()}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <Badge tone={status.tone}>{status.tag}</Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onTrash(doc.id)}
                        aria-label={`Move ${doc.title} to trash`}
                      >
                        Trash
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
