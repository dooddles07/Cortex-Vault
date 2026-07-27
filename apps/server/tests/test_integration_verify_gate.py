"""Email-verification gate on chat/uploads/bookmarks, against a real
database. See app/api/deps.py:require_verified_email for what is and isn't
covered — POST /documents is deliberately left ungated."""

import io

from tests.helpers import requires_db

pytestmark = requires_db


def test_chat_is_blocked_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post("/api/v1/chat", json={"message": "hello"}, headers=headers)
    assert response.status_code == 403


def test_upload_is_blocked_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("note.txt", io.BytesIO(b"hello"), "text/plain")},
        headers=headers,
    )
    assert response.status_code == 403


def test_bookmark_is_blocked_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post(
        "/api/v1/bookmarks", json={"url": "https://example.com"}, headers=headers
    )
    assert response.status_code == 403


def test_documents_endpoint_stays_open_for_an_unverified_account(client, unverified_auth):
    """Plain note-taking is deliberately not gated — only the AI-cost routes
    approved for gating (chat/uploads/bookmarks) are."""
    headers = unverified_auth()
    response = client.post(
        "/api/v1/documents", json={"title": "Note", "type": "note"}, headers=headers
    )
    assert response.status_code == 201


def test_chat_works_once_verified(client, auth, inline_worker):
    """The `auth` fixture pre-verifies — this is the control proving the
    gate above is actually about verification, not some other failure."""
    headers = auth()
    client.post(
        "/api/v1/documents",
        json={"title": "Doc", "type": "note", "content": "Some content to answer from."},
        headers=headers,
    )
    response = client.post("/api/v1/chat", json={"message": "hello"}, headers=headers)
    assert response.status_code == 200
