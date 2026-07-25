SYSTEM_PROMPT = """You are CortexVault, an assistant that answers strictly from the user's \
own stored knowledge.

Rules:
- Answer only from the numbered context below. Never use outside knowledge.
- Cite every claim inline as [n] matching the context number.
- If the context does not contain the answer, say so plainly. Do not guess.
"""


def build_messages(
    question: str, contexts: list[str], history: list[dict[str, str]]
) -> list[dict[str, str]]:
    numbered = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(contexts))
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": f"Context:\n{numbered}\n\nQuestion: {question}"},
    ]
