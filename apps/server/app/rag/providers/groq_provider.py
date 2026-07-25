"""Groq chat provider.

Groq exposes an OpenAI-compatible surface, so the official OpenAI client is
reused with a different base URL rather than hand-rolling HTTP.

Chat only: Groq has no embeddings endpoint. Pair it with another embedding
provider via EMBEDDING_PROVIDER.
"""

from collections.abc import AsyncIterator
from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import settings

_BASE_URL = "https://api.groq.com/openai/v1"


@lru_cache(maxsize=1)
def _get_client() -> AsyncOpenAI:
    """Built on first use so an unset GROQ_API_KEY cannot break startup."""
    return AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url=_BASE_URL)


class GroqChatProvider:
    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        stream = await _get_client().chat.completions.create(
            model=settings.GROQ_CHAT_MODEL,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
