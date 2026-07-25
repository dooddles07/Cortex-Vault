"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  helper?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "h-8 text-body-sm",
  md: "h-10 text-body",
  lg: "h-12 text-body",
} as const;

/** Label is always visible - never placeholder-only. */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  (
    { label, helper, error, size = "md", className, id, readOnly, ...props },
    ref,
  ) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const describedBy = error
      ? `${inputId}-error`
      : helper
        ? `${inputId}-helper`
        : undefined;

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-label text-fg">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-md border bg-surface px-3 text-fg placeholder:text-fg-subtle",
            "transition-[border-color] duration-[--duration-fast] ease-[--ease-standard]",
            "disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-fg-disabled",
            // Read-only stays visually distinct from disabled: normal text colour,
            // decorative border, still focusable.
            readOnly && "border-border bg-bg-subtle",
            error
              ? "border-danger border-2"
              : "border-border-interactive hover:border-border-strong",
            SIZE[size],
            className,
          )}
          {...props}
        />
        {error ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-caption text-danger"
          >
            {error}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="text-caption text-fg-subtle">
            {helper}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = "Field";
