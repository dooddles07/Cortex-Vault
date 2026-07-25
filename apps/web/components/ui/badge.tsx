import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

// Fill is a tint of the tone; text uses on-tint-*, which is verified against the
// composited tint rather than the page background. See docs/DESIGN.md rule T1.
const TONE: Record<Tone, string> = {
  neutral: "bg-tint-neutral text-on-tint-neutral",
  brand: "bg-tint-brand text-on-tint-brand",
  accent: "bg-tint-accent text-on-tint-accent",
  success: "bg-tint-success text-on-tint-success",
  warning: "bg-tint-warning text-on-tint-warning",
  danger: "bg-tint-danger text-on-tint-danger",
  info: "bg-tint-info text-on-tint-info",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-caption font-medium",
        TONE[tone],
        className,
      )}
    >
      {/* Redundant non-colour cue: status is never conveyed by colour alone */}
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
