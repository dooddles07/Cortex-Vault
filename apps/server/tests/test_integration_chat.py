"""Chat streaming against a real database. Covers three regressions: the SSE
generator using a request-scoped session, conversations sorting by creation
instead of activity, and provider failures ending the stream silently."""

import json
import re

import pytest

from tests.helpers import FakeChatProvider, requires_db

pytestmark = requires_db

CONTENT = "Reciprocal rank fusion merges the vector and keyword arms."


def _seed(client, headers):
    response = client.post(
        "/api/v1/documents",
        json={"title": "Doc", "type": "note", "content": CONTENT},
        headers=headers,
    )
    assert response.status_code == 201, response.text


def _events(raw: str) -> list[tuple[str, dict | list]]:
    return [(name, json.loads(data)) for name, data in re.findall(r"event: (\w+)\ndata: (.*)", raw)]


def _chat(client, headers, message, conversation_id=None):
    payload = {"message": message}
    if conversation_id:
        payload["conversation_id"] = conversation_id
    response = client.post("/api/v1/chat", json=payload, headers=headers)
    return response, _events(response.text)


def test_stream_emits_citations_then_tokens_then_done(client, auth, inline_worker):
    headers = auth()
    _seed(client, headers)

    response, events = _chat(client, headers, "What merges the arms?")
    assert response.status_code == 200
    names = [name for name, _ in events]

    assert names[0] == "citations", names
    assert names[-1] == "done", names
    assert "token" in names


def test_stream_completes_after_the_request_scope_closes(client, auth, inline_worker):
    """Regression: the generator used the request-scoped session, which FastAPI
    tears down before the streamed body finishes."""
    headers = auth()
    _seed(client, headers)

    _, events = _chat(client, headers, "What merges the arms?")
    done = [payload for name, payload in events if name == "done"]

    # `done` is only emitted after the assistant message and citations commit.
    assert done, "stream ended before persisting the answer"
    assert done[0]["message_id"]

    detail = client.get(
        f"/api/v1/conversations/{done[0]['conversation_id']}", headers=headers
    ).json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]


def test_citations_are_persisted_with_the_answer(client, auth, inline_worker):
    headers = auth()
    _seed(client, headers)

    _, events = _chat(client, headers, "What merges the arms?")
    citations = next(payload for name, payload in events if name == "citations")

    assert citations
    assert citations[0]["index"] == 1
    assert citations[0]["document_title"] == "Doc"


def test_conversations_sort_by_activity_not_creation(client, auth, inline_worker):
    """Regression: adding a message did not dirty the conversation row, so
    `updated_at` never moved and replies did not resurface the thread."""
    headers = auth()
    _seed(client, headers)

    _, first = _chat(client, headers, "First question")
    conversation_a = next(p for n, p in first if n == "done")["conversation_id"]
    _chat(client, headers, "Second question")

    listing = client.get("/api/v1/conversations", headers=headers).json()
    assert listing[0]["id"] != conversation_a, "newest should lead before the reply"

    _chat(client, headers, "Follow up", conversation_id=conversation_a)

    listing = client.get("/api/v1/conversations", headers=headers).json()
    assert listing[0]["id"] == conversation_a, "replied-to conversation should lead"


async def test_provider_failure_emits_an_error_event(client, auth, inline_worker, monkeypatch):
    """Regression: a mid-stream failure closed the connection with no signal,
    leaving the client unable to distinguish success from failure.

    Driven through the generator rather than the client: the exception that ends
    the stream would otherwise surface before the emitted frames can be read.
    """
    import uuid as _uuid

    from app.services.chat_service import stream_answer

    headers = auth()
    _seed(client, headers)
    user_id = _uuid.UUID(client.get("/api/v1/me", headers=headers).json()["id"])

    monkeypatch.setattr(
        "app.services.chat_service.get_chat_provider",
        lambda *_: FakeChatProvider(fail_after=1),
    )

    # Match the message: a bare RuntimeError also catches unrelated failures
    # (an event-loop misuse, for one), which silently empties `frames` and turns
    # a real bug into a confusing assertion error further down.
    frames: list[str] = []
    with pytest.raises(RuntimeError, match="chat stream failed"):
        async for frame in stream_answer(user_id, "What merges the arms?", None):
            frames.append(frame)

    assert any(f.startswith("event: citations") for f in frames)
    assert any(f.startswith("event: token") for f in frames), "partial answer expected"
    assert frames[-1].startswith("event: error"), frames[-1]
    assert not any(f.startswith("event: done") for f in frames)


def test_conversation_is_scoped_to_its_owner(client, auth, inline_worker):
    owner, stranger = auth(), auth()
    _seed(client, owner)

    _, events = _chat(client, owner, "What merges the arms?")
    conversation_id = next(p for n, p in events if n == "done")["conversation_id"]

    stolen = client.get(f"/api/v1/conversations/{conversation_id}", headers=stranger)
    assert stolen.status_code == 404
    assert client.get("/api/v1/conversations", headers=stranger).json() == []


async def test_long_conversation_gets_a_summary(client, auth, inline_worker, db_session):
    """Once a conversation outgrows the raw history window (6 messages),
    older turns should be folded into conversations.summary rather than
    simply falling off — see chat_service._update_summary."""
    from app.models import Conversation

    headers = auth()
    _seed(client, headers)

    _, first = _chat(client, headers, "First question")
    conversation_id = next(p for n, p in first if n == "done")["conversation_id"]

    # 3 more turns -> 8 messages total, past the 6-message raw window.
    for i in range(3):
        _chat(client, headers, f"Follow up {i}", conversation_id=conversation_id)

    convo = await db_session.get(Conversation, conversation_id)
    assert convo.summary, "summary should be set once history exceeds the raw window"
