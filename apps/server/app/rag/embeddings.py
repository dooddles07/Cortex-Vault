import asyncio

import httpx

from app.rag.providers import get_embedding_provider

_BATCH = 64
_RATE_LIMIT_RETRY_DELAY_S = 5


async def _embed_batch(provider, batch: list[str]) -> list[list[float]]:
    try:
        return await provider.embed(batch)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 429:
            raise
        # One retry covers a transient per-minute cap; a daily cap will just
        # 429 again immediately, which is cheap to find out.
        await asyncio.sleep(_RATE_LIMIT_RETRY_DELAY_S)
        try:
            return await provider.embed(batch)
        except httpx.HTTPStatusError as retry_exc:
            if retry_exc.response.status_code == 429:
                # Surfaced verbatim in the document's ingest error, otherwise
                # indistinguishable from a real parsing bug.
                raise RuntimeError(
                    "Embedding provider rate-limited (429) — retry later"
                ) from retry_exc
            raise


async def embed_texts(texts: list[str]) -> list[list[float]]:
    provider = get_embedding_provider()
    vectors: list[list[float]] = []
    for start in range(0, len(texts), _BATCH):
        vectors.extend(await _embed_batch(provider, texts[start : start + _BATCH]))
    return vectors


async def embed_query(query: str) -> list[float]:
    return (await embed_texts([query]))[0]
