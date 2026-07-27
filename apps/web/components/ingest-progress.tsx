import { Check, TriangleAlert, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type StageState = "done" | "running" | "failed" | "blocked" | "waiting";

const STAGES = ["Upload", "OCR", "Chunk", "Embed"] as const;

/**
 * The API reports one ingest_status, not per-stage percentages, so this shows
 * which stage each status has reached and leaves the running stage
 * indeterminate. Inventing a percentage here would misrepresent real progress.
 */
function stagesFor(status: string): StageState[] {
  switch (status) {
    case "indexed":
      return ["done", "done", "done", "done"];
    case "processing":
      return ["done", "done", "running", "waiting"];
    case "pending":
      return ["done", "waiting", "waiting", "waiting"];
    case "needs_ocr":
      return ["done", "failed", "blocked", "blocked"];
    case "failed":
      return ["done", "done", "failed", "blocked"];
    case "unsupported":
    case "skipped_empty":
      return ["done", "blocked", "blocked", "blocked"];
    default:
      return ["done", "waiting", "waiting", "waiting"];
  }
}

const SUMMARY: Record<string, string> = {
  indexed: "Indexed and searchable.",
  processing: "Chunking and embedding now.",
  pending: "Queued for indexing.",
  needs_ocr: "Text could not be read. Runs OCR on retry.",
  failed: "Indexing failed. The file itself is safe.",
  unsupported: "Stored, but this format cannot be indexed.",
  skipped_empty: "Stored, but no text was found to index.",
};

export function IngestProgress({
  status,
  onRetry,
  className,
}: {
  status: string;
  onRetry?: () => void;
  className?: string;
}) {
  const states = stagesFor(status);
  const failedAt = states.indexOf("failed");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ol className="flex items-center gap-1.5">
        {STAGES.map((stage, i) => (
          <li key={stage} className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              aria-hidden
              className={cn(
                "h-1 w-full overflow-hidden rounded-full",
                states[i] === "done" && "gradient-brand",
                states[i] === "running" && "animate-sheen bg-bg-subtle",
                states[i] === "failed" && "bg-danger",
                (states[i] === "waiting" || states[i] === "blocked") &&
                  "bg-bg-subtle",
              )}
            />
            <span
              className={cn(
                "truncate text-caption",
                states[i] === "failed"
                  ? "text-danger"
                  : states[i] === "done" || states[i] === "running"
                    ? "text-fg-muted"
                    : "text-fg-disabled",
              )}
            >
              {stage}
            </span>
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-2 text-caption text-fg-subtle">
        {/* Never colour alone: each outcome carries its own mark. */}
        {status === "indexed" && <Icon of={Check} size={14} className="text-success" />}
        {failedAt >= 0 && <Icon of={TriangleAlert} size={14} className="text-danger" />}
        {(status === "unsupported" || status === "skipped_empty") && (
          <Icon of={X} size={14} className="text-warning" />
        )}
        {SUMMARY[status] ?? status}
        {onRetry && failedAt >= 0 && (
          <button
            type="button"
            onClick={onRetry}
            className="text-label text-primary-fg underline underline-offset-4 hover:brightness-110"
          >
            Retry
          </button>
        )}
      </p>
    </div>
  );
}
