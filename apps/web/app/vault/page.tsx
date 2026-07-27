"use client";

import {
  ArrowDown,
  ArrowUp,
  FileText,
  Image as ImageIcon,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { IngestProgress } from "@/components/ingest-progress";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Field } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNote, ingestLabel } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, type Document } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type SortKey = "title" | "updated_at";
type Density = "comfortable" | "compact";

const DENSITIES = [
  { id: "comfortable" as Density, label: "Comfortable" },
  { id: "compact" as Density, label: "Compact" },
];

function typeGlyph(type: string) {
  if (/image|png|jpe?g|scan/i.test(type)) return ImageIcon;
  if (/note/i.test(type)) return NotebookPen;
  return FileText;
}

export default function VaultPage() {
  const user = useRequireAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "updated_at",
    desc: true,
  });
  const [density, setDensity] = useState<Density>("comfortable");
  const [pendingTrash, setPendingTrash] = useState<Document | null>(null);
  const [trashing, setTrashing] = useState(false);

  const loading = useRef(false);
  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    api
      .documents({ limit: 50 })
      .then((page) => setDocuments(page.items))
      .catch((e) => setError(e.message))
      .finally(() => {
        loading.current = false;
      });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Ingest runs on a background worker — poll while anything is still
  // in flight so status/progress update without a manual reload.
  const inFlight = documents?.some(
    (d) => d.ingest_status === "processing" || d.ingest_status === "pending",
  );
  useEffect(() => {
    if (!inFlight) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [inFlight, load]);

  const rows = useMemo(() => {
    if (!documents) return null;
    const sorted = [...documents].sort((a, b) => {
      const value =
        sort.key === "title"
          ? a.title.localeCompare(b.title)
          : a.updated_at.localeCompare(b.updated_at);
      return sort.desc ? -value : value;
    });
    return sorted;
  }, [documents, sort]);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createDocument({
        title: title.trim(),
        content: content.trim(),
        type: "note",
      });
      setTitle("");
      setContent("");
      toast("Note saved. It is being indexed now.", "success");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmTrash() {
    if (!pendingTrash) return;
    setTrashing(true);
    try {
      await api.trashDocument(pendingTrash.id);
      toast(`“${pendingTrash.title}” moved to Trash. Recoverable for 30 days.`);
      setPendingTrash(null);
      load();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not move that to Trash.",
        "danger",
      );
    } finally {
      setTrashing(false);
    }
  }

  async function onRetry(doc: Document) {
    try {
      await api.retryUpload(doc.id);
      load();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not retry that document.",
        "danger",
      );
    }
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, desc: !prev.desc } : { key, desc: true },
    );
  }

  if (!user) return null;

  const rowHeight = density === "compact" ? "h-9" : "h-12";

  return (
    <AppShell title="Knowledge Base">
      <div className="mx-auto flex w-full max-w-(--layout-content-max) flex-col gap-8">
        <section aria-labelledby="capture" className="flex flex-col gap-4">
          <h2 id="capture" className="text-h2 text-fg">
            Add to your vault
          </h2>

          <div className="grid gap-4 xl:grid-cols-2">
            <UploadDropzone onUploaded={load} />

            <form
              onSubmit={onCreate}
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
            >
              <h3 className="text-h4 text-fg">Write a note</h3>
              <Field
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is this about?"
                required
              />
              <div className="flex flex-1 flex-col gap-2">
                <label htmlFor="note-body" className="text-label text-fg">
                  Content
                </label>
                <textarea
                  id="note-body"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Paste or write anything. It is chunked and indexed on save."
                  className="min-h-[96px] w-full flex-1 resize-y rounded-md border border-border-interactive bg-surface px-3 py-2 text-body text-fg transition-[border-color] duration-(--duration-fast) placeholder:text-fg-subtle hover:border-border-strong"
                />
              </div>
              {error && <ErrorNote message={error} />}
              <div className="flex justify-end">
                <Button type="submit" size="md" loading={saving} disabled={!title.trim()}>
                  Save note
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section aria-labelledby="documents" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="documents" className="text-h2 text-fg">
              Documents
              {rows && (
                <span className="tabular ml-2 text-body-sm text-fg-subtle">
                  {rows.length}
                </span>
              )}
            </h2>
            <Segmented
              segments={DENSITIES}
              value={density}
              onChange={setDensity}
              label="Row density"
            />
          </div>

          {!documents && !error && <ListSkeleton rows={5} />}

          {rows?.length === 0 && (
            <EmptyState
              title="Nothing stored yet"
              body="Drop a file above or write a note. Text is extracted, chunked and embedded automatically."
            />
          )}

          {rows && rows.length > 0 && (
            // Wide content scrolls inside its own container so the page body
            // never scrolls sideways.
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[520px] border-collapse">
                {/* Sticky resolves against this scroll container, not the page,
                    so any offset here would hide the first row behind it. */}
                <thead className="sticky top-0 bg-bg-subtle">
                  <tr className="border-b border-border">
                    <SortHeader
                      label="Title"
                      active={sort.key === "title"}
                      desc={sort.desc}
                      onClick={() => toggleSort("title")}
                    />
                    <th className="hidden px-4 text-left text-overline text-fg-subtle md:table-cell">
                      Type
                    </th>
                    <SortHeader
                      label="Updated"
                      className="hidden md:table-cell"
                      active={sort.key === "updated_at"}
                      desc={sort.desc}
                      onClick={() => toggleSort("updated_at")}
                    />
                    <th className="px-4 text-left text-overline text-fg-subtle">
                      Status
                    </th>
                    <th className="px-4 text-right text-overline text-fg-subtle">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((doc) => {
                    const status = ingestLabel(doc.ingest_status);
                    const settled =
                      doc.ingest_status === "indexed" ||
                      doc.ingest_status === "pending";
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "border-b border-border transition-colors duration-(--duration-fast) last:border-b-0 hover:bg-bg-subtle",
                          rowHeight,
                        )}
                      >
                        <td className="max-w-[280px] px-4 py-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon
                              of={typeGlyph(doc.type)}
                              size={16}
                              className="text-icon-subtle"
                            />
                            <span className="truncate text-label text-fg">
                              {doc.title}
                            </span>
                          </span>
                          {!settled && (
                            <IngestProgress
                              status={doc.ingest_status}
                              onRetry={() => void onRetry(doc)}
                              className="mt-2"
                            />
                          )}
                        </td>
                        <td className="hidden px-4 py-2 text-citation text-fg-subtle md:table-cell">
                          {doc.type}
                        </td>
                        <td className="tabular hidden px-4 py-2 text-caption text-fg-subtle md:table-cell">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2">
                          <Badge tone={status.tone}>{status.tag}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setPendingTrash(doc)}
                            aria-label={`Move ${doc.title} to Trash`}
                            className="grid size-11 place-items-center rounded-md text-icon-subtle transition-colors duration-(--duration-fast) hover:bg-tint-danger hover:text-on-tint-danger"
                          >
                            <Icon of={Trash2} size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={pendingTrash !== null}
        onClose={() => setPendingTrash(null)}
        title="Move to Trash?"
        description={
          pendingTrash
            ? `“${pendingTrash.title}” stops appearing in search and chat. It stays recoverable for 30 days.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setPendingTrash(null)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              size="md"
              loading={trashing}
              onClick={onConfirmTrash}
            >
              Move to Trash
            </Button>
          </>
        }
      />
    </AppShell>
  );
}

function SortHeader({
  label,
  active,
  desc,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (desc ? "descending" : "ascending") : "none"}
      className={cn("px-4 text-left", className)}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 text-overline transition-colors duration-(--duration-fast)",
          active ? "text-fg" : "text-fg-subtle hover:text-fg",
        )}
      >
        {label}
        {active && <Icon of={desc ? ArrowDown : ArrowUp} size={12} />}
      </button>
    </th>
  );
}
