"""Trash retention purge against a real database. No scheduler exists on the
free tier, so purge_expired_trash runs opportunistically (see app/main.py);
this tests the purge logic itself, independent of when it's triggered."""

from datetime import UTC, datetime, timedelta

from app.models import Document
from app.services.document_service import purge_expired_trash
from tests.helpers import requires_db

pytestmark = requires_db


def _create_doc(client, headers):
    response = client.post(
        "/api/v1/documents", json={"title": "Doc", "type": "note"}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _backdate_trash(db_session, document_id, days_ago):
    doc = await db_session.get(Document, document_id)
    doc.deleted_at = datetime.now(UTC) - timedelta(days=days_ago)
    await db_session.commit()


async def test_purge_removes_documents_past_retention(client, auth, db_session):
    headers = auth()
    doc_id = _create_doc(client, headers)
    client.post(f"/api/v1/documents/{doc_id}/trash", headers=headers)
    await _backdate_trash(db_session, doc_id, days_ago=31)

    purged = await purge_expired_trash(db_session)

    assert purged == 1
    assert await db_session.get(Document, doc_id) is None


async def test_purge_leaves_recently_trashed_documents(client, auth, db_session):
    headers = auth()
    doc_id = _create_doc(client, headers)
    client.post(f"/api/v1/documents/{doc_id}/trash", headers=headers)
    await _backdate_trash(db_session, doc_id, days_ago=5)

    purged = await purge_expired_trash(db_session)

    assert purged == 0
    assert await db_session.get(Document, doc_id) is not None


async def test_purge_leaves_non_trashed_documents(client, auth, db_session):
    headers = auth()
    doc_id = _create_doc(client, headers)

    purged = await purge_expired_trash(db_session)

    assert purged == 0
    assert await db_session.get(Document, doc_id) is not None
