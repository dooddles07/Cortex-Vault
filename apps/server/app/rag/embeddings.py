from app.rag.providers import get_embedding_provider

_BATCH = 64


async def embed_texts(texts: list[str]) -> list[list[float]]:
    provider = get_embedding_provider()
    vectors: list[list[float]] = []
    for start in range(0, len(texts), _BATCH):
        vectors.extend(await provider.embed(texts[start : start + _BATCH]))
    return vectors


async def embed_query(query: str) -> list[float]:
    return (await embed_texts([query]))[0]
