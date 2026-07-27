"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED } from "@/components/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export function UploadButton({ onUploaded }: { onUploaded?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await api.upload(file);
      // A null job means nothing indexable was extracted; say so rather than
      // implying the file is being processed.
      toast(
        result.job_id
          ? `${file.name} is being indexed.`
          : `${file.name} was stored but cannot be searched (${result.ingest_status}).`,
        result.job_id ? "success" : "info",
      );
      onUploaded?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed.", "danger");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      {/* The button below is the real control. sr-only would leave this input
          exposed as a second, unlabelled "Choose File" control. */}
      <input
        ref={input}
        type="file"
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={onPick}
        accept={ACCEPTED}
      />
      <Button size="md" loading={busy} onClick={() => input.current?.click()}>
        <Icon of={Upload} size={16} />
        Upload
      </Button>
    </>
  );
}
