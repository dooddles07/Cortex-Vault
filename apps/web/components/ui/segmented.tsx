"use client";

import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";

export type Segment<T extends string> = {
  id: T;
  label: string;
  hint?: string;
};

/**
 * One selected option out of a small set. The indicator is a single shared
 * element moved with a layout animation, so the transition is interruptible
 * and nothing reflows. Selection carries weight and ink as well as the fill,
 * never colour alone.
 */
export function Segmented<T extends string>({
  segments,
  value,
  onChange,
  label,
  className,
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const groupId = React.useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-full gap-1 rounded-lg border border-border bg-bg-subtle p-1 sm:w-auto",
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.id === value;
        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onChange(segment.id)}
            aria-pressed={active}
            title={segment.hint}
            className={cn(
              "relative min-h-11 flex-1 rounded-md px-3 text-label transition-colors duration-(--duration-fast) ease-(--ease-standard) sm:min-h-9 sm:flex-none",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                aria-hidden
                layoutId={`segmented-${groupId}`}
                transition={reduced ? { duration: 0 } : SPRING.snappy}
                className="absolute inset-0 rounded-md border border-border bg-surface shadow-e1"
              />
            )}
            <span className={cn("relative", active && "font-semibold")}>
              {segment.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
