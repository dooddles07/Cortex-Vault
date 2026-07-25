import pytest

from app.rag.providers.groq_provider import GroqChatProvider
from app.rag.providers.registry import get_chat_provider, get_embedding_provider


def test_every_chat_provider_resolves():
    for name in ("openai", "gemini", "groq", "ollama"):
        assert get_chat_provider(name) is not None


def test_every_embedding_provider_resolves():
    for name in ("openai", "gemini", "ollama"):
        assert get_embedding_provider(name) is not None


def test_groq_resolves_to_its_own_provider():
    assert isinstance(get_chat_provider("groq"), GroqChatProvider)


def test_groq_is_rejected_as_an_embedding_provider():
    """Groq has no embeddings endpoint; this must fail loudly at config time
    rather than at the first ingestion."""
    with pytest.raises(ValueError) as exc:
        get_embedding_provider("groq")
    assert "groq" in str(exc.value)
    assert "gemini" in str(exc.value)


def test_unknown_provider_names_the_supported_set():
    with pytest.raises(ValueError) as exc:
        get_chat_provider("not-a-provider")
    assert "Supported:" in str(exc.value)


def test_resolving_a_provider_does_not_require_its_api_key():
    """Clients are built lazily, so an unconfigured provider must not raise on
    construction — that crashed the whole app once."""
    get_chat_provider("groq")
    get_chat_provider("openai")
