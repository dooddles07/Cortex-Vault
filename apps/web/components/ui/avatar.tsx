import { cn } from "@/lib/cn";

/** Up to two letters from the display name, falling back to the email local part. */
export function initialsOf(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    words.length > 1
      ? `${words[0]![0]}${words[1]![0]}`
      : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function Avatar({
  name,
  email,
  size = 32,
  className,
}: {
  name: string | null | undefined;
  email: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-tint-brand font-semibold leading-none tracking-tight text-on-tint-brand",
        className,
      )}
    >
      {initialsOf(name, email)}
    </span>
  );
}
