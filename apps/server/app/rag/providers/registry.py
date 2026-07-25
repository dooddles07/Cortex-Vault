from app.core.config import settings
from app.rag.providers.base import ChatProvider, EmbeddingProvider
from app.rag.providers.gemini_provider import GeminiChatProvider, GeminiEmbeddingProvider
from app.rag.providers.ollama_provider import OllamaChatProvider, OllamaEmbeddingProvider
from app.rag.providers.openai_provider import OpenAIChatProvider, OpenAIEmbeddingProvider

_EMBEDDING = {
    "openai": OpenAIEmbeddingProvider,
    "gemini": GeminiEmbeddingProvider,
    "ollama": OllamaEmbeddingProvider,
}
_CHAT = {
    "openai": OpenAIChatProvider,
    "gemini": GeminiChatProvider,
    "ollama": OllamaChatProvider,
}


def get_embedding_provider(name: str | None = None) -> EmbeddingProvider:
    return _EMBEDDING[name or settings.EMBEDDING_PROVIDER]()


def get_chat_provider(name: str | None = None) -> ChatProvider:
    return _CHAT[name or settings.CHAT_PROVIDER]()
