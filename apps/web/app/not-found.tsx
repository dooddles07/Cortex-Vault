import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Glyph } from "@/components/brand/glyph";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main
      id="main"
      className="animate-enter flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <Glyph size={56} />
      <p className="text-overline text-fg-subtle">404</p>
      <h1 className="max-w-[720px] text-display-2 text-fg">
        This page is not in your vault
      </h1>
      <p className="measure text-body-lg text-fg-muted">
        The link may be stale, or the document was moved to Trash. Trashed items
        stay recoverable for 30 days.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Links, not buttons wrapping links - never nest interactive elements */}
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-(--duration-fast) hover:bg-primary-hover"
        >
          <Icon of={ArrowLeft} size={18} />
          Back to dashboard
        </Link>
        <Link
          href="/vault"
          className="inline-flex h-12 items-center gap-2 rounded-md border border-border-interactive bg-surface px-5 text-body text-fg transition-colors duration-(--duration-fast) hover:bg-bg-subtle"
        >
          <Icon of={Trash2} size={18} />
          Open Trash
        </Link>
      </div>
      <p className="max-w-[600px] text-caption text-fg-subtle">
        Still stuck? Every screen is reachable from the sidebar, and Ctrl K
        searches everything.
      </p>
    </main>
  );
}
