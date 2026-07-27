import json

from app.services.chat_service import _rewrite_query, _sse


def test_sse_frame_format():
    frame = _sse("token", {"delta": "hi"})
    assert frame.startswith("event: token\ndata: ")
    assert frame.endswith("\n\n")


def test_sse_payload_roundtrips():
    payload = [{"index": 1, "document_title": 'quotes "and" \n newlines'}]
    body = _sse("citations", payload).split("data: ", 1)[1].strip()
    assert json.loads(body) == payload


def test_sse_data_is_single_line():
    # A literal newline inside data: would split the frame and corrupt the stream.
    frame = _sse("token", {"delta": "line1\nline2"})
    assert len(frame.rstrip("\n").split("\n")) == 2


async def test_rewrite_query_skips_the_provider_without_history(monkeypatch):
    """A first message has nothing to resolve pronouns against — must not
    spend an LLM call on it."""

    def _fail_if_called(*_):
        raise AssertionError("must not call the provider when history is empty")

    monkeypatch.setattr("app.services.chat_service.get_chat_provider", _fail_if_called)

    assert await _rewrite_query("What is X?", []) == "What is X?"


async def test_rewrite_query_falls_back_on_provider_failure(monkeypatch):
    class _BoomProvider:
        async def stream(self, messages):
            raise RuntimeError("simulated provider failure")
            yield  # pragma: no cover - unreachable; makes this an async generator

    monkeypatch.setattr("app.services.chat_service.get_chat_provider", lambda: _BoomProvider())

    result = await _rewrite_query("What is X?", [{"role": "user", "content": "hi"}])

    assert result == "What is X?"
