"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

/** Each clause is grounded in exactly one source. That mapping is the product. */
const CLAUSES = [
  {
    text: "You chose pgvector for the MVP because it needs no extra infrastructure and stays free-tier friendly.",
    source: 1,
  },
  {
    text: " The accepted tradeoff is a lower recall and latency ceiling than a dedicated vector database at very large scale.",
    source: 2,
  },
  {
    text: " Maya's note is the reason it was allowed: keep the migration path cheap, and the raw benchmark stops mattering.",
    source: 3,
  },
] as const;

const SOURCES = [
  { n: 1, title: "ARCHITECTURE.md", meta: "p.6 · chunk 04" },
  { n: 2, title: "pgvector vs Qdrant", meta: "web clip · chunk 11" },
  { n: 3, title: "Interview — Maya", meta: "meeting notes · chunk 02" },
] as const;

const FULL = CLAUSES.map((c) => c.text).join("");
const CHARS_PER_TICK = 3;
const TICK_MS = 16;

/**
 * The landing page thesis, running live: an answer arrives, its citations
 * appear as each claim lands, and pointing at a citation shows exactly which
 * clause it grounds. Reduced motion gets the finished state immediately.
 */
export function GroundedAnswer() {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const [typed, setTyped] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [runId, setRunId] = React.useState(0);

  const done = typed >= FULL.length;

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setTyped(FULL.length);
      return;
    }
    setTyped(0);
    const timer = setInterval(() => {
      setTyped((n) => {
        if (n >= FULL.length) {
          clearInterval(timer);
          return n;
        }
        return Math.min(n + CHARS_PER_TICK, FULL.length);
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [inView, reduced, runId]);

  // Character offset where each clause ends, so a chip can appear the moment
  // its claim is fully written.
  const bounds = React.useMemo(() => {
    let running = 0;
    return CLAUSES.map((c) => (running += c.text.length));
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[880px] overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-e4"
    >
      {/* Gradient is a graphic token: a hairline, never a text background */}
      <div aria-hidden className="h-[3px] w-full gradient-brand" />

      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="text-overline text-fg-subtle">Asked</span>
          <p className="text-body text-fg-muted">
            What did we decide about pgvector, and why?
          </p>
        </div>

        <div className="grid">
          {/* Invisible full copy reserves the final height so nothing below
              jumps while the answer writes itself. */}
          <p
            aria-hidden
            className="invisible col-start-1 row-start-1 text-body-lg"
          >
            {FULL}
          </p>

          <p aria-hidden className="col-start-1 row-start-1 text-body-lg text-fg">
            {CLAUSES.map((clause, i) => {
              const start = i === 0 ? 0 : bounds[i - 1]!;
              const slice = clause.text.slice(0, Math.max(0, typed - start));
              const lit = hovered === clause.source;
              return (
                <span
                  key={clause.source}
                  className={cn(
                    "box-decoration-clone transition-colors duration-(--duration-fast) ease-(--ease-standard)",
                    lit &&
                      "border-l-2 border-accent bg-tint-accent pl-1.5 -ml-1.5",
                  )}
                >
                  {slice}
                </span>
              );
            })}
            {!done && (
              <span
                aria-hidden
                className="streaming-cursor ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] bg-accent"
              />
            )}
          </p>

          {/* The animated copy is decorative; this is what gets announced. */}
          <p className="sr-only">{FULL}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-overline text-fg-subtle">Sources</span>
          {SOURCES.map((source, i) => {
            const revealed = typed >= bounds[i]!;
            return (
              <motion.button
                key={source.n}
                type="button"
                animate={{ opacity: revealed ? 1 : 0.25 }}
                transition={{ duration: DURATION.base, ease: EASE.out }}
                onMouseEnter={() => setHovered(source.n)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(source.n)}
                onBlur={() => setHovered(null)}
                aria-label={`Highlight the claim grounded in ${source.title}`}
                className={cn(
                  "inline-grid min-h-11 place-items-center rounded-xs px-1",
                  !revealed && "pointer-events-none",
                )}
              >
                <span
                  className={cn(
                    "rounded-xs px-2 py-1 text-citation transition-colors duration-(--duration-fast)",
                    hovered === source.n
                      ? "bg-accent text-fg-on-accent"
                      : "bg-tint-accent text-on-tint-accent",
                  )}
                >
                  {source.n}. {source.title}
                  <span className="hidden sm:inline"> · {source.meta}</span>
                </span>
              </motion.button>
            );
          })}

          <span className="flex-1" />

          {done && !reduced && (
            <button
              type="button"
              onClick={() => setRunId((n) => n + 1)}
              className="inline-flex min-h-11 items-center gap-1.5 text-caption text-fg-subtle transition-colors duration-(--duration-fast) hover:text-fg"
            >
              <Icon of={RotateCcw} size={14} />
              Replay
            </button>
          )}
        </div>

        <p className="text-caption text-fg-subtle">
          Point at a source to see the exact claim it grounds.
        </p>
      </div>
    </div>
  );
}
