import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "destructive"
  | "link";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary text-fg-on-primary hover:bg-primary-hover active:scale-[0.98]",
  secondary:
    "bg-surface text-fg border border-border-interactive hover:bg-bg-subtle active:scale-[0.98]",
  ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg active:scale-[0.98]",
  // Cyan with white text is 1.81:1, so accent always takes the dark on-accent ink.
  accent:
    "bg-accent text-fg-on-accent hover:brightness-95 active:scale-[0.98]",
  destructive:
    "bg-danger text-fg-on-primary hover:brightness-90 active:scale-[0.98]",
  link: "text-primary-fg underline underline-offset-4 hover:brightness-110",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-body-sm control-sm",
  md: "h-10 px-4 text-label control-md",
  lg: "h-12 px-5 text-body",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      // Real disabled attribute, never a class alone.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-[background-color,color,transform,filter] duration-(--duration-fast) ease-(--ease-standard)",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "link" ? "rounded-xs px-0" : "rounded-md",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {/* Label keeps its box while loading so the button never changes width.
          inline-flex so an icon and its text sit on one line rather than wrapping. */}
      <span
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </button>
  ),
);
Button.displayName = "Button";
