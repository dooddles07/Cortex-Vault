"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { api, type Citation, type Message } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Turn = { role: "user" | "assistant"; content: string; citations?: Citation[] };

export default function ChatPage() {
  const user = useRequireAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, streaming]);

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || streaming) return;

    setDraft("");
    setError(null);
    setStreaming(true);
    setTurns((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);

    const patchLastTurn = (patch: (turn: Turn) => Turn) =>
      setTurns((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = patch(last);
        return next;
      });

    try {
      await api.chat(question, conversationId, {
        onCitations: (citations) => patchLastTurn((turn) => ({ ...turn, citations })),
        onToken: (delta) =>
          patchLastTurn((turn) => ({ ...turn, content: turn.content + delta })),
        onDone: (info) => setConversationId(info.conversation_id),
        onError: (message) => setError(message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The answer could not be completed.");
    } finally {
      setStreaming(false);
    }
  }

  function onNewChat() {
    setConversationId(null);
    setTurns([]);
    setError(null);
  }

  if (!user) return null;

  return (
    <AppShell
      title={turns[0]?.content.slice(0, 60) || "Chat"}
      actions={
        <Button variant="secondary" size="md" onClick={onNewChat} disabled={streaming}>
          New chat
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-[--layout-chat-max] flex-col gap-10">
        {turns.length === 0 && (
          <div className="flex flex-col gap-2 py-8">
            <h2 className="text-h1 text-fg">Ask your vault</h2>
            <p className="measure text-body-lg text-fg-muted">
              Answers come only from what you have stored, and every claim carries
              a citation. If it is not in your vault, it does not get said.
            </p>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-lg border border-border bg-bg-subtle p-4">
                <p className="text-body text-fg">{turn.content}</p>
              </div>
            </div>
          ) : (
            <article key={i} className="flex flex-col gap-3" aria-label="Assistant answer">
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-4 rounded-full bg-accent" />
                <span className="text-overline text-fg-subtle">CortexVault</span>
                {turn.citations && (
                  <span className="text-caption text-accent-fg">
                    grounded in {turn.citations.length}{" "}
                    {turn.citations.length === 1 ? "source" : "sources"}
                  </span>
                )}
              </div>

              <p className="measure whitespace-pre-wrap text-body-lg text-fg">
                {turn.content}
                {streaming && i === turns.length - 1 && (
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
                  {turn.citations.map((c) => (
                    <li key={c.chunk_id}>
                      <span
                        title={c.document_title}
                        className="inline-grid min-h-11 cursor-default place-items-center rounded-xs px-1"
                      >
                        <span className="rounded-xs bg-tint-accent px-1 py-0.5 text-citation text-on-tint-accent">
                          {c.index}. {c.document_title}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ),
        )}

        {error && <ErrorNote message={error} />}
        <div ref={bottom} />

        <form
          onSubmit={onAsk}
          className="sticky bottom-4 flex flex-col gap-3 rounded-lg border border-border-interactive bg-surface p-4"
        >
          <label htmlFor="ask" className="sr-only">
            Ask your vault
          </label>
          <input
            id="ask"
            name="ask"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={streaming}
            placeholder="Ask anything about what you have stored…"
            className="w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-caption text-fg-subtle">
              Answers cite your sources. Nothing is generated from outside your vault.
            </p>
            <Button type="submit" size="md" disabled={streaming || !draft.trim()}>
              {streaming ? "Thinking…" : "Ask"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
