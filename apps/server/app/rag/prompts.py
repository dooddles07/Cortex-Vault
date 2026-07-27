SYSTEM_PROMPT = """You are CortexVault, an assistant that answers strictly from the user's \
own stored knowledge.

Rules:
- Answer only from the numbered context below. Never use outside knowledge.
- Cite every claim inline as [n] matching the context number.
- If the context does not contain the answer, say so plainly. Do not guess.
"""

REWRITE_SYSTEM_PROMPT = """Rewrite the user's latest message as a fully standalone question, \
resolving any pronouns or references ("it", "that", "the second one") using the conversation \
history. Reply with only the rewritten question and nothing else — no preamble, no quotes."""

SUMMARIZE_SYSTEM_PROMPT = """Summarize this conversation concisely, preserving specific facts, \
decisions, and named entities a later answer might depend on. Output only the summary, no \
preamble."""

RERANK_SYSTEM_PROMPT = """Given a question and numbered candidate passages, return a \
comma-separated list of the passage numbers ordered from most to least relevant to answering \
the question. Omit passages that are clearly irrelevant. Reply with only the numbers, \
comma-separated — no words, no preamble."""


def build_messages(
    question: str,
    contexts: list[str],
    history: list[dict[str, str]],
    summary: str | None = None,
) -> list[dict[str, str]]:
    numbered = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(contexts))
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if summary:
        messages.append(
            {"role": "system", "content": f"Summary of earlier conversation:\n{summary}"}
        )
    messages.extend(history)
    messages.append({"role": "user", "content": f"Context:\n{numbered}\n\nQuestion: {question}"})
    return messages


def build_rewrite_messages(
    question: str, history: list[dict[str, str]]
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": question},
    ]


def build_summarize_messages(
    older_messages: list[dict[str, str]], previous_summary: str | None
) -> list[dict[str, str]]:
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in older_messages)
    prefix = f"Existing summary:\n{previous_summary}\n\n" if previous_summary else ""
    return [
        {"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT},
        {"role": "user", "content": f"{prefix}Conversation so far:\n{transcript}"},
    ]


def build_rerank_messages(question: str, contexts: list[str]) -> list[dict[str, str]]:
    numbered = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(contexts))
    return [
        {"role": "system", "content": RERANK_SYSTEM_PROMPT},
        {"role": "user", "content": f"Question: {question}\n\nCandidates:\n{numbered}"},
    ]
