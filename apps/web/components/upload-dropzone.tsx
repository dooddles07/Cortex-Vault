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

// Mirrors app.core.config.settings.MAX_UPLOAD_BYTES — failing fast here saves
// uploading a large file over a slow connection only to get a 413 back.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function tooLarge(file: File): boolean {
  return file.size > MAX_UPLOAD_BYTES;
}

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
      const failed: string[] = [];
      let anySucceeded = false;
      try {
        for (const file of list) {
          if (tooLarge(file)) {
            failed.push(file.name);
            toast(
              `${file.name} is over the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`,
              "danger",
            );
            continue;
          }
          try {
            const result = await api.upload(file);
            anySucceeded = true;
            // A null job means nothing indexable came out; say so rather than
            // implying the file is on its way into the index.
            toast(
              result.job_id
                ? `${file.name} is being indexed.`
                : `${file.name} was stored but cannot be searched (${result.ingest_status}).`,
              result.job_id ? "success" : "info",
            );
          } catch (err) {
            failed.push(file.name);
            toast(
              err instanceof Error ? `${file.name}: ${err.message}` : `${file.name} failed to upload.`,
              "danger",
            );
          }
        }
        if (anySucceeded) onUploaded?.();
        if (failed.length > 1) {
          toast(`${failed.length} files failed to upload.`, "danger");
        }
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
