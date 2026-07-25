import { cn } from "@/lib/cn";

/** Brand mark. Native vector traced from media/icon.png; do not substitute. */
export function Glyph({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/glyph.svg"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-[family-name:var(--font-display)] font-bold tracking-[-0.02em] text-fg",
        className,
      )}
    >
      CortexVault
    </span>
  );
}
