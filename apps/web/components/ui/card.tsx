import { cn } from "@/lib/cn";

export function Card({
  interactive = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-e1",
        interactive &&
          "cursor-pointer transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) hover:bg-surface-raised hover:shadow-e2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
