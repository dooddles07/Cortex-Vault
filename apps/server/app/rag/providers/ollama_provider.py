import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings


class OllamaEmbeddingProvider:
    def __init__(self, model: str = "nomic-embed-text") -> None:
        self.model = model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=120) as client:
            response = await client.post(
                "/api/embed", json={"model": self.model, "input": texts}
            )
            response.raise_for_status()
            return response.json()["embeddings"]


class OllamaChatProvider:
    def __init__(self, model: str = "llama3.1") -> None:
        self.model = model

    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        async with httpx.AsyncClient(base_url=settings.OLLAMA_BASE_URL, timeout=None) as client:
            async with client.stream(
                "POST", "/api/chat", json={"model": self.model, "messages": messages, "stream": True}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    content = json.loads(line).get("message", {}).get("content")
                    if content:
                        yield content
