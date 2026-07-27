import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Document
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.folder_service import get_folder

logger = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30


async def list_documents(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    folder_id: uuid.UUID | None = None,
    doc_type: str | None = None,
    trashed: bool = False,
) -> tuple[list[Document], int]:
    filters = [Document.user_id == user_id]
    filters.append(Document.deleted_at.isnot(None) if trashed else Document.deleted_at.is_(None))
    if folder_id:
        filters.append(Document.folder_id == folder_id)
    if doc_type:
        filters.append(Document.type == doc_type)

    total = await db.scalar(select(func.count()).select_from(Document).where(*filters)) or 0
    stmt = (
        select(Document)
        .where(*filters)
        .order_by(Document.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list((await db.scalars(stmt)).all()), total


async def get_document(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
    doc = await db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if not doc:
        raise NotFoundError("Document")
    return doc


async def create_document(
    db: AsyncSession, user_id: uuid.UUID, payload: DocumentCreate
) -> Document:
    if payload.folder_id:
        await get_folder(db, user_id, payload.folder_id)
    doc = Document(user_id=user_id, **payload.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def set_ingest_status(db: AsyncSession, doc: Document, status: str) -> Document:
    doc.ingest_status = status
    await db.commit()
    await db.refresh(doc)
    return doc


async def set_file_path(db: AsyncSession, doc: Document, file_path: str) -> Document:
    doc.file_path = file_path
    await db.commit()
    await db.refresh(doc)
    return doc


async def update_document(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID, payload: DocumentUpdate
) -> Document:
    doc = await get_document(db, user_id, document_id)
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("folder_id"):
        await get_folder(db, user_id, updates["folder_id"])
    for field, value in updates.items():
        setattr(doc, field, value)
    await db.commit()
    await db.refresh(doc)
    return doc


async def trash_document(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
    doc = await get_document(db, user_id, document_id)
    doc.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(doc)
    return doc


async def restore_document(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
) -> Document:
    doc = await get_document(db, user_id, document_id)
    doc.deleted_at = None
    await db.commit()
    await db.refresh(doc)
    return doc


async def set_starred(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID, starred: bool
) -> Document:
    doc = await get_document(db, user_id, document_id)
    doc.starred = starred
    await db.commit()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
    from app.storage.r2 import delete_original

    doc = await get_document(db, user_id, document_id)
    file_path = doc.file_path
    await db.delete(doc)
    await db.commit()
    await delete_original(file_path)


async def purge_expired_trash(db: AsyncSession) -> int:
    """Hard-delete documents trashed longer than the retention window, across
    all users. There is no scheduler on the free tier, so this runs
    opportunistically on API startup — which, on Render free, is every time
    the instance wakes from an idle sleep. Not truly time-based, but it needs
    no new infrastructure and no cost. Purges one at a time through
    delete_document so R2 originals are cleaned up too."""
    from app.storage.r2 import delete_original

    cutoff = datetime.now(UTC) - timedelta(days=TRASH_RETENTION_DAYS)
    expired = await db.scalars(
        select(Document).where(Document.deleted_at.isnot(None), Document.deleted_at < cutoff)
    )
    rows = list(expired)
    for doc in rows:
        file_path = doc.file_path
        await db.delete(doc)
        await db.commit()
        await delete_original(file_path)
    if rows:
        logger.info("purged %d expired trashed document(s)", len(rows))
    return len(rows)
