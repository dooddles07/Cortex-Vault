import uuid

from fastapi import APIRouter, BackgroundTasks, Query, status

from app.api.deps import CurrentUser, DbSession
from app.models import Document
from app.schemas.common import Page
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services import document_service, ingest_service
from app.services.dispatch import dispatch_ingest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=Page[DocumentRead])
async def list_documents(
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(50, le=100),
    offset: int = 0,
    folder_id: uuid.UUID | None = None,
    type: str | None = None,
    trashed: bool = False,
) -> Page[DocumentRead]:
    items, total = await document_service.list_documents(
        db, user.id, limit, offset, folder_id, type, trashed
    )
    return Page(
        items=[DocumentRead.model_validate(d) for d in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate, user: CurrentUser, db: DbSession, background: BackgroundTasks
) -> Document:
    doc = await document_service.create_document(db, user.id, payload)
    if doc.content:
        job = await ingest_service.queue_ingest(db, user.id, doc.id)
        await dispatch_ingest(background, doc.id, job.id)
    return doc


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Document:
    return await document_service.get_document(db, user.id, document_id)


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: uuid.UUID,
    payload: DocumentUpdate,
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
) -> Document:
    doc = await document_service.update_document(db, user.id, document_id, payload)
    if payload.content is not None:
        job = await ingest_service.queue_ingest(db, user.id, doc.id)
        await dispatch_ingest(background, doc.id, job.id)
    return doc


@router.post("/{document_id}/trash", response_model=DocumentRead)
async def trash_document(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Document:
    return await document_service.trash_document(db, user.id, document_id)


@router.post("/{document_id}/restore", response_model=DocumentRead)
async def restore_document(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Document:
    return await document_service.restore_document(db, user.id, document_id)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await document_service.delete_document(db, user.id, document_id)
