import Link from "next/link";
import { Glyph, Wordmark } from "@/components/brand/glyph";

/**
 * One shell for all five auth screens, so they stop drifting apart. Every one
 * of them gets the main landmark the skip link targets.
 */
export function AuthLayout({
  children,
  aside,
}: {
  children: React.ReactNode;
  /** Omit for the short utility screens, which stay single-column. */
  aside?: { headline: string; body: string; proof: string };
}) {
  return (
    <div className={aside ? "grid min-h-dvh lg:grid-cols-2" : "grid min-h-dvh"}>
      <main
        id="main"
        className="flex items-center justify-center px-6 py-16"
      >
        <div className="flex w-full max-w-[400px] flex-col gap-5">
          <Link href="/" className="flex w-fit items-center gap-2">
            <Glyph size={32} />
            <Wordmark className="text-[1.25rem]" />
          </Link>
          {children}
        </div>
      </main>

      {aside && (
        <aside className="hidden flex-col justify-center gap-6 border-l border-border bg-surface-brand px-16 lg:flex">
          <span aria-hidden className="h-1 w-[120px] rounded-sm gradient-brand" />
          <p className="text-display-2 text-fg">{aside.headline}</p>
          <p className="measure text-body-lg text-fg-muted">{aside.body}</p>
          {/* Mono is the provenance voice throughout the product. */}
          <p className="text-citation text-fg-subtle">{aside.proof}</p>
        </aside>
      )}
    </div>
  );
}
