import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Every icon in the product goes through here. It pins one stroke weight so the
 * set reads as a family next to Inter, and defaults to aria-hidden because our
 * icons sit beside a text label - the label is the accessible name. Icon-only
 * controls pass a real aria-label on the button, not on the svg.
 */
export function Icon({
  of: Glyph,
  size = 20,
  className,
  ...props
}: LucideProps & { of: LucideIcon }) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      aria-hidden
      focusable={false}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}
