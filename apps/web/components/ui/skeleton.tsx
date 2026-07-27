import { cn } from "@/lib/cn";

/**
 * Placeholder for content whose shape is already known. Indeterminate work
 * reads as a travelling sheen rather than a spinner - docs/UI-UX.md section 5.
 * Reduced motion drops the sheen and leaves the static fill.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-sheen rounded-md bg-bg-subtle",
        className,
      )}
    />
  );
}

/** Skeleton for the dashboard stat row: three cards, one big numeral each. */
export function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="status">
      <span className="sr-only">Loading your vault</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for any of the bordered lists: n rows, title plus meta. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface"
      role="status"
    >
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* Widths vary so the block reads as text, not a progress bar */}
            <Skeleton className={cn("h-4", i % 2 ? "w-1/3" : "w-1/2")} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-[22px] w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
