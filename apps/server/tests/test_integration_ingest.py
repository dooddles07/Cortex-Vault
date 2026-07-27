"""Ingestion against a real database. Covers the fix for documents that were
left reporting `processing` forever when embedding failed."""

import pytest

from tests.helpers import requires_db

pytestmark = requires_db

CONTENT = (
    "Reciprocal rank fusion merges the vector and keyword arms.\n\n"
    "The arq worker consumes jobs from Redis so ingestion never blocks a request."
)


def _create(client, headers, **overrides):
    payload = {"title": "Doc", "type": "note", "content": CONTENT} | overrides
    response = client.post("/api/v1/documents", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_document_reaches_indexed(client, auth, inline_worker):
    headers = auth()
    doc_id = _create(client, headers)

    status = client.get(f"/api/v1/uploads/{doc_id}/status", headers=headers).json()
    assert status["ingest_status"] == "indexed"
    assert status["job_status"] == "completed"
    assert status["error"] is None


def test_chunks_are_written_and_counted(client, auth, inline_worker):
    headers = auth()
    _create(client, headers)

    summary = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert summary["documents"] == 1
    assert summary["chunks"] >= 1


def test_empty_document_is_skipped_not_failed(client, auth, inline_worker):
    headers = auth()
    response = client.post(
        "/api/v1/documents", json={"title": "Empty", "type": "note"}, headers=headers
    )
    doc_id = response.json()["id"]

    # No content means no enqueue, so the document stays pending rather than erroring.
    status = client.get(f"/api/v1/uploads/{doc_id}/status", headers=headers).json()
    assert status["ingest_status"] in {"pending", "skipped_empty"}


def test_failed_embedding_marks_document_failed(client, auth, inline_worker, monkeypatch):
    """Regression: the worker used to set only job.status, leaving the document
    reporting `processing` forever."""
    headers = auth()

    async def _boom(_texts):
        raise RuntimeError("embedding provider is down")

    monkeypatch.setattr("app.services.ingest_service.embed_texts", _boom)

    with pytest.raises(RuntimeError):
        _create(client, headers)

    documents = client.get("/api/v1/documents", headers=headers).json()["items"]
    assert documents[0]["ingest_status"] == "failed"


def test_reingest_replaces_chunks_rather_than_duplicating(client, auth, inline_worker):
    headers = auth()
    doc_id = _create(client, headers)
    first = client.get("/api/v1/dashboard/summary", headers=headers).json()["chunks"]

    client.patch(
        f"/api/v1/documents/{doc_id}", json={"content": CONTENT}, headers=headers
    )
    second = client.get("/api/v1/dashboard/summary", headers=headers).json()["chunks"]

    assert second == first


def test_reingest_with_unchanged_content_skips_re_embedding(
    client, auth, inline_worker, monkeypatch
):
    """Embedding cache: identical content must not spend the free daily quota
    re-embedding chunks that are already correct."""
    headers = auth()
    doc_id = _create(client, headers)

    async def _fail_if_called(_texts):
        raise AssertionError("must not re-embed unchanged content")

    monkeypatch.setattr("app.services.ingest_service.embed_texts", _fail_if_called)

    response = client.patch(
        f"/api/v1/documents/{doc_id}", json={"content": CONTENT}, headers=headers
    )
    assert response.status_code == 200

    status = client.get(f"/api/v1/uploads/{doc_id}/status", headers=headers).json()
    assert status["ingest_status"] == "indexed"


def test_reingest_with_changed_content_does_re_embed(client, auth, inline_worker):
    headers = auth()
    doc_id = _create(client, headers)
    first = client.get("/api/v1/dashboard/summary", headers=headers).json()["chunks"]

    client.patch(
        f"/api/v1/documents/{doc_id}",
        json={"content": CONTENT + "\n\nA genuinely new paragraph."},
        headers=headers,
    )
    second = client.get("/api/v1/dashboard/summary", headers=headers).json()["chunks"]

    assert second > first


def test_trashed_document_is_excluded_from_listing(client, auth, inline_worker):
    headers = auth()
    doc_id = _create(client, headers)

    client.post(f"/api/v1/documents/{doc_id}/trash", headers=headers)
    assert client.get("/api/v1/documents", headers=headers).json()["total"] == 0
    assert client.get("/api/v1/documents?trashed=true", headers=headers).json()["total"] == 1
