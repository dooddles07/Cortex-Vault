"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useTheme, type Theme } from "@/lib/theme";

const OPTIONS = [
  { id: "light", label: "Light", glyph: Sun },
  { id: "dark", label: "Dark", glyph: Moon },
  { id: "system", label: "System", glyph: Monitor },
] as const satisfies readonly { id: Theme; label: string; glyph: typeof Sun }[];

/**
 * Three explicit choices rather than a two-state flip: "system" is a real
 * preference and a toggle cannot express it. Selection carries an icon, a
 * label and a fill, so it never reads by colour alone.
 */
export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-border bg-bg-subtle p-1",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            aria-pressed={active}
            aria-label={compact ? option.label : undefined}
            title={compact ? option.label : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md transition-colors duration-(--duration-fast) ease-(--ease-standard)",
              // Touch keeps the 44px floor; pointer devices tighten to 36.
              compact ? "control-sm size-11 sm:size-9" : "min-h-11 flex-1 px-3 sm:min-h-9",
              active
                ? "border border-border bg-surface text-fg shadow-e1"
                : "border border-transparent text-fg-muted hover:text-fg",
            )}
          >
            <Icon of={option.glyph} size={16} />
            {!compact && (
              <span className={cn("text-label", active && "font-semibold")}>
                {option.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
