import { cn } from "@/lib/cn";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-body-sm text-fg-subtle" role="status">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="text-body-sm text-danger-fg">
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-h4 text-fg">{title}</p>
      <p className="measure text-body-sm text-fg-muted">{body}</p>
      {action}
    </div>
  );
}

/** Maps an ingest_status to a badge tone plus human wording. */
export function ingestLabel(status: string): { tag: string; tone: "success" | "danger" | "warning" | "neutral" | "accent" } {
  switch (status) {
    case "indexed":
      return { tag: "Ready", tone: "success" };
    case "processing":
      return { tag: "Indexing", tone: "accent" };
    case "pending":
      return { tag: "Queued", tone: "neutral" };
    case "needs_ocr":
      return { tag: "Needs OCR", tone: "warning" };
    case "unsupported":
      return { tag: "Not indexable", tone: "warning" };
    case "skipped_empty":
      return { tag: "Empty", tone: "neutral" };
    case "failed":
      return { tag: "Failed", tone: "danger" };
    default:
      return { tag: status, tone: "neutral" };
  }
}
