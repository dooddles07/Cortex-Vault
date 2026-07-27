"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUp, Check, Copy, Plus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CitationPane, type Source } from "@/components/citation-pane";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ErrorNote } from "@/components/ui/states";
import { api, type Citation } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

type Turn = { role: "user" | "assistant"; content: string; citations?: Citation[] };

const SUGGESTIONS = [
  "Summarise what I saved this week",
  "What did we decide, and why?",
  "Find every mention of pricing",
  "What contradicts what I wrote last month?",
] as const;

/** Following stops the moment the reader scrolls up to re-read something. */
const FOLLOW_THRESHOLD_PX = 100;

export default function ChatPage() {
  const user = useRequireAuth();
  const reduced = useReducedMotion();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controller.current?.abort();
  }, []);

  useEffect(() => {
    const distance =
      document.documentElement.scrollHeight -
      window.scrollY -
      window.innerHeight;
    if (distance > FOLLOW_THRESHOLD_PX) return;
    bottom.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "end",
    });
  }, [turns, streaming, reduced]);

  // Grow with the content instead of scrolling a one-line box.
  useEffect(() => {
    const el = composer.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const ask = useCallback(
    async (question: string) => {
      if (!question || streaming) return;

      setDraft("");
      setError(null);
      setStreaming(true);
      setTurns((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "" },
      ]);

      const patchLastTurn = (patch: (turn: Turn) => Turn) =>
        setTurns((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = patch(last);
          return next;
        });

      const ac = new AbortController();
      controller.current = ac;

      try {
        await api.chat(
          question,
          conversationId,
          {
            onCitations: (citations) => patchLastTurn((turn) => ({ ...turn, citations })),
            onToken: (delta) =>
              patchLastTurn((turn) => ({ ...turn, content: turn.content + delta })),
            onDone: (info) => setConversationId(info.conversation_id),
            onError: (message) => setError(message),
          },
          ac.signal,
        );
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "The answer could not be completed.",
        );
      } finally {
        if (controller.current === ac) controller.current = null;
        if (!ac.signal.aborted) setStreaming(false);
      }
    },
    [conversationId, streaming],
  );

  function onNewChat() {
    controller.current?.abort();
    setConversationId(null);
    setTurns([]);
    setError(null);
    setSource(null);
  }

  if (!user) return null;

  return (
    <AppShell
      title={turns[0]?.content.slice(0, 60) || "Chat"}
      actions={
        <Button
          variant="secondary"
          size="md"
          onClick={onNewChat}
          disabled={streaming || turns.length === 0}
        >
          <Icon of={Plus} size={16} />
          New chat
        </Button>
      }
    >
      {/* Padding, not margin: w-full resolves against the content box, so only
          padding actually narrows the reading column to clear the pane. */}
      <div className={cn("w-full", source && "lg:pr-(--layout-source-pane)")}>
        <div className="mx-auto flex w-full max-w-(--layout-chat-max) flex-col gap-10 pb-4">
        {turns.length === 0 && (
          <div className="flex flex-col gap-6 py-6">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-tint-accent px-3 py-1 text-caption text-on-tint-accent">
                <Icon of={Sparkles} size={14} />
                Grounded in your vault only
              </span>
              <h2 className="text-h1 text-fg">Ask your vault</h2>
              <p className="measure text-body-lg text-fg-muted">
                Answers come only from what you have stored, and every claim
                carries a citation. If it is not in your vault, it does not get
                said.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-overline text-fg-subtle">Try</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left text-body-sm text-fg-muted transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-interactive hover:bg-surface-raised hover:text-fg"
                  >
                    {suggestion}
                    <Icon of={ArrowUp} size={14} className="rotate-45 text-icon-subtle" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <motion.div
              key={i}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
              className="flex justify-end"
            >
              <div className="max-w-[80%] rounded-lg border border-border bg-surface-raised px-4 py-3">
                <p className="whitespace-pre-wrap text-body text-fg">{turn.content}</p>
              </div>
            </motion.div>
          ) : (
            <Answer
              key={i}
              turn={turn}
              streaming={streaming && i === turns.length - 1}
              onOpenSource={setSource}
            />
          ),
        )}

        {error && <ErrorNote message={error} />}
        <div ref={bottom} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft.trim());
          }}
          className="sticky bottom-4 flex flex-col gap-3 rounded-xl border border-border-interactive bg-surface p-3 shadow-e3"
        >
          <label htmlFor="ask" className="sr-only">
            Ask your vault
          </label>
          <textarea
            ref={composer}
            id="ask"
            name="ask"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a newline, as everywhere else.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(draft.trim());
              }
            }}
            disabled={streaming}
            placeholder="Ask anything about what you have stored…"
            className="w-full resize-none bg-transparent px-1 py-1 text-body text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="flex items-end justify-between gap-4">
            <p className="text-caption text-fg-subtle">
              Cited from your sources. Nothing comes from outside your vault.
            </p>
            <Button
              type="submit"
              size="md"
              loading={streaming}
              disabled={!draft.trim()}
              aria-label="Send question"
            >
              <Icon of={ArrowUp} size={16} />
              Ask
            </Button>
          </div>
          </form>
        </div>
      </div>

      <CitationPane source={source} onClose={() => setSource(null)} />
    </AppShell>
  );
}

function Answer({
  turn,
  streaming,
  onOpenSource,
}: {
  turn: Turn;
  streaming: boolean;
  onOpenSource: (source: Source) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(turn.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="flex flex-col gap-3" aria-label="Assistant answer">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-4 rounded-full bg-accent" />
        <span className="text-overline text-fg-subtle">CortexVault</span>
        {turn.citations && turn.citations.length > 0 && (
          <span className="text-caption text-accent-fg">
            grounded in {turn.citations.length}{" "}
            {turn.citations.length === 1 ? "source" : "sources"}
          </span>
        )}
      </div>

      {/* Tokens append as plain text - no per-token animation, which would
          reflow the column every frame. Only the cursor moves. */}
      <p className="measure whitespace-pre-wrap text-body-lg text-fg">
        {turn.content}
        {streaming && (
          <>
            <span
              aria-hidden
              className="streaming-cursor ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] bg-accent"
            />
            <span className="sr-only" aria-live="polite">
              Answer is still streaming
            </span>
          </>
        )}
      </p>

      {turn.citations && turn.citations.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1">
          <li className="text-caption text-fg-subtle">Sources</li>
          {turn.citations.map((citation) => (
            <li key={citation.chunk_id}>
              <button
                type="button"
                onClick={() =>
                  onOpenSource({
                    documentId: citation.document_id,
                    documentTitle: citation.document_title,
                    chunkId: citation.chunk_id,
                    index: citation.index,
                  })
                }
                aria-label={`Open source ${citation.index}: ${citation.document_title}`}
                className="inline-grid min-h-11 place-items-center rounded-xs px-1"
              >
                <span className="rounded-xs bg-tint-accent px-1.5 py-0.5 text-citation text-on-tint-accent transition-colors duration-(--duration-fast) hover:bg-accent hover:text-fg-on-accent">
                  {citation.index}. {citation.document_title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!streaming && turn.content && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-caption transition-colors duration-(--duration-fast)",
              copied ? "text-success" : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon of={copied ? Check : Copy} size={14} />
            {copied ? "Copied" : "Copy answer"}
          </button>
        </div>
      )}
    </article>
  );
}
