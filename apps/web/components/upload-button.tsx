"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function UploadButton({ onUploaded }: { onUploaded?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await api.upload(file);
      // A null job means nothing indexable was extracted; say so rather than
      // implying the file is being processed.
      setNote(
        result.job_id
          ? `${file.name} is being indexed.`
          : `${file.name} was stored but cannot be searched (${result.ingest_status}).`,
      );
      onUploaded?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {note && (
        <span role="status" className="hidden text-caption text-fg-subtle md:inline">
          {note}
        </span>
      )}
      {/* The button below is the real control. sr-only would leave this input
          exposed as a second, unlabelled "Choose File" control. */}
      <input
        ref={input}
        type="file"
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
        accept=".pdf,.txt,.md,.csv,.json,.xml,.html"
      />
      <Button size="md" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : "Upload"}
      </Button>
    </div>
  );
}
