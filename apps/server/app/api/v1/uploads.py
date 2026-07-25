import uuid

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.document import DocumentCreate
from app.schemas.upload import IngestStatus, UploadAccepted
from app.services import document_service, ingest_service
from app.workers.queue import enqueue_ingest

router = APIRouter(prefix="/uploads", tags=["uploads"])

_TEXT_TYPES = {"text/plain", "text/markdown", "text/csv"}


@router.post("", response_model=UploadAccepted, status_code=status.HTTP_202_ACCEPTED)
async def upload(user: CurrentUser, db: DbSession, file: UploadFile = File(...)) -> UploadAccepted:
    raw = await file.read()
    content = raw.decode("utf-8", errors="replace") if file.content_type in _TEXT_TYPES else None

    doc = await document_service.create_document(
        db,
        user.id,
        DocumentCreate(
            title=file.filename or "Untitled",
            type="note" if content else "pdf",
            content=content,
        ),
    )
    job = await ingest_service.queue_ingest(db, user.id, doc.id)
    await enqueue_ingest(doc.id, job.id)
    return UploadAccepted(document_id=doc.id, job_id=job.id, ingest_status=doc.ingest_status)


@router.get("/{document_id}/status", response_model=IngestStatus)
async def upload_status(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> IngestStatus:
    return await ingest_service.get_status(db, user.id, document_id)
