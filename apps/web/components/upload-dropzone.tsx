"use client";

import { CloudUpload } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export const ACCEPTED =
  ".pdf,.txt,.md,.csv,.json,.xml,.html,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.tiff,.bmp";

/**
 * Drag is an accelerator, never the only path - the picker button below is a
 * real focusable control and does the same job. Spec: docs/DESIGN.md section 7
 * (UploadDropzone).
 */
export function UploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();

  const send = React.useCallback(
    async (files: FileList | null) => {
      const list = Array.from(files ?? []);
      if (list.length === 0) return;
      setBusy(true);
      try {
        for (const file of list) {
          const result = await api.upload(file);
          // A null job means nothing indexable came out; say so rather than
          // implying the file is on its way into the index.
          toast(
            result.job_id
              ? `${file.name} is being indexed.`
              : `${file.name} was stored but cannot be searched (${result.ingest_status}).`,
            result.job_id ? "success" : "info",
          );
        }
        onUploaded?.();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed.", "danger");
      } finally {
        setBusy(false);
        if (input.current) input.current.value = "";
      }
    },
    [onUploaded, toast],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void send(e.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center",
        "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        over
          ? "border-primary bg-surface-brand"
          : "border-border-interactive bg-surface",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-11 place-items-center rounded-full transition-colors duration-(--duration-fast)",
          over ? "bg-tint-brand text-on-tint-brand" : "bg-bg-subtle text-icon-subtle",
        )}
      >
        <Icon of={CloudUpload} size={22} />
      </span>

      <p className="text-h4 text-fg">
        {over ? "Drop to add to your vault" : "Drop files here"}
      </p>
      <p className="measure text-body-sm text-fg-muted">
        PDF, Word, PowerPoint, Excel, Markdown, text and images. Scans and photos
        go through OCR automatically.
      </p>

      <input
        ref={input}
        type="file"
        hidden
        aria-hidden
        tabIndex={-1}
        multiple
        accept={ACCEPTED}
        onChange={(e) => void send(e.target.files)}
      />
      <Button
        size="md"
        variant="secondary"
        loading={busy}
        onClick={() => input.current?.click()}
      >
        Choose files
      </Button>
    </div>
  );
}
