"use client";

import { cn } from "@/lib/cn";

/**
 * Visual affordance only. The trigger must already carry its own accessible
 * name - a tooltip is never the sole source of a control's label, so this is
 * aria-hidden and appears on hover or keyboard focus of the wrapper.
 */
export function Tooltip({
  label,
  side = "right",
  children,
  className,
}: {
  label: string;
  side?: "right" | "top";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/tip relative flex", className)}>
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-(--z-tooltip) whitespace-nowrap rounded-md border border-border bg-surface-raised px-2 py-1 text-caption text-fg opacity-0 shadow-e3",
          "transition-opacity duration-(--duration-fast) ease-(--ease-standard)",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "right"
            ? "left-full top-1/2 ml-2 -translate-y-1/2"
            : "bottom-full left-1/2 mb-2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </div>
  );
}
