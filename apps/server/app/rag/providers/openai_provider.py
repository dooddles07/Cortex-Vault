from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.core.config import settings

_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class OpenAIEmbeddingProvider:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        response = await _client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL, input=texts
        )
        return [item.embedding for item in response.data]


class OpenAIChatProvider:
    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        stream = await _client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL, messages=messages, stream=True
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
