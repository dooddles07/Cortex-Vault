import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _headers() -> dict[str, str]:
    return {
        "x-goog-api-key": settings.GEMINI_API_KEY or "",
        "Content-Type": "application/json",
    }


class GeminiEmbeddingProvider:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        model = f"models/{settings.GEMINI_EMBEDDING_MODEL}"
        payload = {
            "requests": [
                {"model": model, "content": {"parts": [{"text": text}]}} for text in texts
            ]
        }
        async with httpx.AsyncClient(base_url=_BASE_URL, timeout=120) as client:
            response = await client.post(
                f"/{model}:batchEmbedContents", json=payload, headers=_headers()
            )
            response.raise_for_status()
            return [item["values"] for item in response.json()["embeddings"]]


class GeminiChatProvider:
    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        payload = _to_gemini_payload(messages)
        model = f"models/{settings.GEMINI_CHAT_MODEL}"

        async with httpx.AsyncClient(base_url=_BASE_URL, timeout=None) as client:
            async with client.stream(
                "POST",
                f"/{model}:streamGenerateContent",
                params={"alt": "sse"},
                json=payload,
                headers=_headers(),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    for text in _extract_text(line[5:].strip()):
                        yield text


def _to_gemini_payload(messages: list[dict[str, str]]) -> dict:
    """Gemini takes system text separately and calls the assistant role 'model'."""
    system_parts = [m["content"] for m in messages if m["role"] == "system"]
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
        if m["role"] != "system"
    ]

    payload: dict = {"contents": contents}
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}
    return payload


def _extract_text(raw: str) -> list[str]:
    if not raw or raw == "[DONE]":
        return []
    try:
        chunk = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [
        part["text"]
        for candidate in chunk.get("candidates", [])
        for part in candidate.get("content", {}).get("parts", [])
        if part.get("text")
    ]
