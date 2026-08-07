"use client";

import { useEffect } from "react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Glyph } from "@/components/brand/glyph";
import { Icon } from "@/components/ui/icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="animate-enter flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <Glyph size={56} />
      <p className="text-overline text-fg-subtle">Error</p>
      <h1 className="max-w-[720px] text-display-2 text-fg">
        Something went wrong
      </h1>
      <p className="measure text-body-lg text-fg-muted">
        That screen hit an unexpected error. Nothing in your vault was lost.
        {error.digest ? ` Reference: ${error.digest}` : ""}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
        >
          <Icon of={RefreshCw} size={18} />
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-12 items-center gap-2 rounded-md border border-border-interactive bg-surface px-5 text-body text-fg transition-colors duration-(--duration-fast) hover:bg-bg-subtle"
        >
          <Icon of={ArrowLeft} size={18} />
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
