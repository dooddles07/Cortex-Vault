from collections.abc import AsyncIterator
from typing import Protocol


class EmbeddingProvider(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class ChatProvider(Protocol):
    def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]: ...
