"""POST /internal/purge, the endpoint an external cron trigger (see
infra/purge-cron) calls instead of relying on the opportunistic
API-startup purge. Token-gated, not JWT-gated -- there is no calling user."""

from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.models import Document, Session
from tests.helpers import requires_db

pytestmark = requires_db


async def test_purge_requires_a_token(client):
    response = client.post("/api/v1/internal/purge")
    assert response.status_code == 401


async def test_purge_rejects_a_wrong_token(client):
    response = client.post(
        "/api/v1/internal/purge", headers={"X-Internal-Token": "wrong"}
    )
    assert response.status_code == 401


async def test_purge_404s_when_unconfigured(client, monkeypatch):
    monkeypatch.setattr(settings, "INTERNAL_PURGE_TOKEN", None)
    response = client.post(
        "/api/v1/internal/purge",
        headers={"X-Internal-Token": "test-internal-purge-token"},
    )
    assert response.status_code == 404


async def test_purge_removes_expired_trash_and_sessions(client, auth, db_session):
    headers = auth()
    doc_response = client.post(
        "/api/v1/documents", json={"title": "Doc", "type": "note"}, headers=headers
    )
    assert doc_response.status_code == 201, doc_response.text
    doc_id = doc_response.json()["id"]
    client.post(f"/api/v1/documents/{doc_id}/trash", headers=headers)

    doc = await db_session.get(Document, doc_id)
    doc.deleted_at = datetime.now(UTC) - timedelta(days=31)

    stale_session = Session(
        user_id=doc.user_id,
        expires_at=datetime.now(UTC) - timedelta(days=40),
    )
    db_session.add(stale_session)
    await db_session.commit()

    response = client.post(
        "/api/v1/internal/purge",
        headers={"X-Internal-Token": settings.INTERNAL_PURGE_TOKEN},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["trashed_documents"] == 1
    assert body["sessions"] == 1
    assert await db_session.get(Document, doc_id) is None
    assert await db_session.get(Session, stale_session.id) is None
