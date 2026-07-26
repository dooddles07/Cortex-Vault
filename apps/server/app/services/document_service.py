import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


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
    for field, value in payload.model_dump(exclude_unset=True).items():
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


async def delete_document(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
    doc = await get_document(db, user_id, document_id)
    await db.delete(doc)
    await db.commit()
