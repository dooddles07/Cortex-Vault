"""Bookmark saver against a real database. No network call — fetch_readable
is patched, same principle as fake_providers: a test that reaches the real
internet is a bug."""

from tests.helpers import requires_db

pytestmark = requires_db


def _fake_fetch(monkeypatch, title="Saved Page", text="The saved article body."):
    async def _fetch(_url):
        return title, text

    monkeypatch.setattr("app.api.v1.bookmarks.fetch_readable", _fetch)


def test_bookmark_is_saved_and_reaches_indexed(client, auth, inline_worker, monkeypatch):
    _fake_fetch(monkeypatch)
    headers = auth()

    response = client.post(
        "/api/v1/bookmarks", json={"url": "https://example.com/article"}, headers=headers
    )
    assert response.status_code == 202, response.text
    doc_id = response.json()["document_id"]

    status = client.get(f"/api/v1/uploads/{doc_id}/status", headers=headers).json()
    assert status["ingest_status"] == "indexed"

    doc = client.get(f"/api/v1/documents/{doc_id}", headers=headers).json()
    assert doc["type"] == "bookmark"
    assert doc["source_url"] == "https://example.com/article"
    assert doc["title"] == "Saved Page"


def test_bookmark_falls_back_to_url_when_page_has_no_title(
    client, auth, inline_worker, monkeypatch
):
    _fake_fetch(monkeypatch, title="", text="Body only, no title tag.")
    headers = auth()

    response = client.post(
        "/api/v1/bookmarks", json={"url": "https://example.com/no-title"}, headers=headers
    )
    doc = client.get(
        f"/api/v1/documents/{response.json()['document_id']}", headers=headers
    ).json()

    assert doc["title"] == "https://example.com/no-title"


def test_unreachable_page_returns_422_not_500(client, auth, monkeypatch):
    from app.rag.bookmarks import BookmarkFetchError

    async def _fail(_url):
        raise BookmarkFetchError("connection refused")

    monkeypatch.setattr("app.api.v1.bookmarks.fetch_readable", _fail)
    headers = auth()

    response = client.post(
        "/api/v1/bookmarks", json={"url": "https://unreachable.example"}, headers=headers
    )

    assert response.status_code == 422
