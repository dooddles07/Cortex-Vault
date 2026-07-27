"""Re-ranking the RRF-fused candidate list with the already-wired chat LLM,
instead of just truncating it (which is what RERANK_TOP_N did before this —
the name overstated it). No new provider, no new dependency: the same Groq
(or whichever CHAT_PROVIDER) call already used for the answer itself.
"""

import logging

from app.rag.prompts import build_rerank_messages
from app.rag.providers import get_chat_provider
from app.rag.retrieval import RetrievedChunk

logger = logging.getLogger(__name__)


async def rerank(
    question: str, candidates: list[RetrievedChunk], top_n: int
) -> list[RetrievedChunk]:
    """Asks the LLM to order `candidates` by relevance to `question`, then
    takes the top `top_n`. Falls back to the original RRF order — today's
    behavior — on any failure or an unparseable response, so a broken
    re-rank call can never break retrieval."""
    if not candidates:
        return candidates

    messages = build_rerank_messages(question, [c.content for c in candidates])
    try:
        text = ""
        async for token in get_chat_provider().stream(messages):
            text += token
    except Exception:
        logger.warning("rerank call failed; falling back to RRF order", exc_info=True)
        return candidates[:top_n]

    order = _parse_order(text, len(candidates))
    if not order:
        return candidates[:top_n]
    return [candidates[i] for i in order][:top_n]


def _parse_order(text: str, count: int) -> list[int]:
    """Parses a comma-separated list of 1-based passage numbers into valid,
    de-duplicated 0-based indices. Returns [] if nothing usable is found —
    the caller treats that the same as a failed call."""
    seen: set[int] = set()
    order: list[int] = []
    for piece in text.replace("\n", ",").split(","):
        # Trailing punctuation ("3.", "3]") is a common minor deviation from
        # the requested format — worth stripping rather than discarding the
        # whole number over it.
        piece = piece.strip().strip(".])")
        if not piece.isdigit():
            continue
        index = int(piece) - 1
        if 0 <= index < count and index not in seen:
            seen.add(index)
            order.append(index)
    return order
