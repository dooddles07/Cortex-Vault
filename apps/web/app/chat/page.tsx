import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

function CitationChip({ n }: { n: number }) {
  return (
    <button
      type="button"
      // Visual pill is 20px; the hit area is padded to the 44px touch floor.
      className="inline-grid size-11 cursor-pointer place-items-center rounded-xs"
      aria-label={`Open source ${n}`}
    >
      <span className="rounded-xs bg-tint-accent px-1 py-0.5 text-citation text-on-tint-accent">
        {n}
      </span>
    </button>
  );
}

export default function ChatPage() {
  return (
    <AppShell
      title="Vector store decision"
      actions={
        <Button variant="secondary" size="md">
          New chat
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-[--layout-chat-max] flex-col gap-10">
        {/* user turn */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg border border-border bg-bg-subtle p-4">
            <p className="text-body text-fg">
              What did we decide about pgvector vs a dedicated vector DB, and why?
            </p>
          </div>
        </div>

        {/* assistant turn: no bubble, full column, reads as a document */}
        <article className="flex flex-col gap-3" aria-label="Assistant answer">
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-4 rounded-full bg-accent" />
            <span className="text-overline text-fg-subtle">CortexVault</span>
            <span className="text-caption text-accent-fg">grounded in 4 sources</span>
          </div>

          <p className="measure text-body-lg text-fg">
            You chose pgvector for the MVP because it needs no extra infrastructure
            and stays free-tier friendly.
          </p>

          <div className="flex items-center gap-1">
            <span className="text-caption text-fg-subtle">Sources</span>
            {[1, 2, 3, 4].map((n) => (
              <CitationChip key={n} n={n} />
            ))}
          </div>

          <p className="measure text-body-lg text-fg">
            The accepted tradeoff is a lower recall and latency ceiling than
            Pinecone or Qdrant at very large scale, mitigated by a documented
            swap-out path once data shows pgvector is the bottleneck — not
            preemptively.
          </p>

          {/* Tokens append as plain text; only the cursor animates. */}
          <p className="measure text-body-lg text-fg">
            The revisit trigger is recall degradation at scale, not
            <span
              aria-hidden
              className="streaming-cursor ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] bg-accent"
            />
            <span className="sr-only" aria-live="polite">
              Answer is still streaming
            </span>
          </p>
        </article>

        <form className="flex flex-col gap-3 rounded-lg border border-border-interactive bg-surface p-4">
          <label htmlFor="ask" className="sr-only">
            Ask your vault
          </label>
          <input
            id="ask"
            name="ask"
            placeholder="Ask anything about your 1,204 indexed chunks…"
            className="w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-caption text-fg-subtle">
              Answers cite your sources. Nothing is generated from outside your
              vault.
            </p>
            <Button type="submit" size="md">
              Ask
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
