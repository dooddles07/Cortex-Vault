"""Chat/uploads/bookmarks are open regardless of email verification status,
against a real database. The verification gate (`require_verified_email`) was
removed deliberately — see docs/ROADMAP.md item 12: without a verified
sending domain, Resend's sandbox mode meant real users other than the account
owner never received the verification email at all, so the gate just locked
everyone out with no way through."""

import io

from tests.helpers import requires_db

pytestmark = requires_db


def test_chat_works_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post("/api/v1/chat", json={"message": "hello"}, headers=headers)
    assert response.status_code == 200


def test_upload_works_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("note.txt", io.BytesIO(b"hello"), "text/plain")},
        headers=headers,
    )
    assert response.status_code == 202


def test_bookmark_works_for_an_unverified_account(client, unverified_auth, monkeypatch):
    async def _fake_fetch(_url):
        return "Example", "Example page body."

    monkeypatch.setattr("app.api.v1.bookmarks.fetch_readable", _fake_fetch)
    headers = unverified_auth()
    response = client.post(
        "/api/v1/bookmarks", json={"url": "https://example.com"}, headers=headers
    )
    assert response.status_code == 202


def test_documents_endpoint_stays_open_for_an_unverified_account(client, unverified_auth):
    headers = unverified_auth()
    response = client.post(
        "/api/v1/documents", json={"title": "Note", "type": "note"}, headers=headers
    )
    assert response.status_code == 201
