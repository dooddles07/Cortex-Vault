from app.core.config import settings
from app.rag.providers.base import ChatProvider, EmbeddingProvider
from app.rag.providers.gemini_provider import GeminiChatProvider, GeminiEmbeddingProvider
from app.rag.providers.groq_provider import GroqChatProvider
from app.rag.providers.ollama_provider import OllamaChatProvider, OllamaEmbeddingProvider
from app.rag.providers.openai_provider import OpenAIChatProvider, OpenAIEmbeddingProvider

# Groq is absent from _EMBEDDING on purpose: it has no embeddings endpoint.
_EMBEDDING = {
    "openai": OpenAIEmbeddingProvider,
    "gemini": GeminiEmbeddingProvider,
    "ollama": OllamaEmbeddingProvider,
}
_CHAT = {
    "openai": OpenAIChatProvider,
    "gemini": GeminiChatProvider,
    "groq": GroqChatProvider,
    "ollama": OllamaChatProvider,
}


def _resolve(table: dict, name: str, kind: str):
    try:
        return table[name]()
    except KeyError:
        supported = ", ".join(sorted(table))
        raise ValueError(
            f"Unknown {kind} provider {name!r}. Supported: {supported}."
        ) from None


def get_embedding_provider(name: str | None = None) -> EmbeddingProvider:
    return _resolve(_EMBEDDING, name or settings.EMBEDDING_PROVIDER, "embedding")


def get_chat_provider(name: str | None = None) -> ChatProvider:
    return _resolve(_CHAT, name or settings.CHAT_PROVIDER, "chat")
