import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.schemas.document import DocumentCreate
from app.schemas.upload import IngestStatus, UploadAccepted
from app.services import document_service, ingest_service
from app.workers.queue import enqueue_ingest

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Text types are decoded and indexed; everything else is stored unparsed.
_TEXT_TYPES = {"text/plain", "text/markdown", "text/csv", "application/json"}
_TYPE_BY_MIME = {
    "application/pdf": "pdf",
    "text/markdown": "note",
    "text/plain": "note",
    "text/csv": "note",
    "application/json": "note",
}
_CHUNK = 1024 * 1024


async def _read_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read in chunks so an oversized upload is rejected before it is buffered."""
    buffer = bytearray()
    while chunk := await file.read(_CHUNK):
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"File exceeds the {max_bytes // (1024 * 1024)}MB limit",
            )
    return bytes(buffer)


@router.post("", response_model=UploadAccepted, status_code=status.HTTP_202_ACCEPTED)
async def upload(user: CurrentUser, db: DbSession, file: UploadFile = File(...)) -> UploadAccepted:
    raw = await _read_capped(file, settings.MAX_UPLOAD_BYTES)
    mime = (file.content_type or "").split(";")[0].strip()
    content = raw.decode("utf-8", errors="replace") if mime in _TEXT_TYPES else None

    doc = await document_service.create_document(
        db,
        user.id,
        DocumentCreate(
            title=file.filename or "Untitled",
            type=_TYPE_BY_MIME.get(mime, "file"),
            content=content,
        ),
    )
    job = await ingest_service.queue_ingest(db, user.id, doc.id)
    await enqueue_ingest(doc.id, job.id)
    return UploadAccepted(document_id=doc.id, job_id=job.id, ingest_status=doc.ingest_status)


@router.get("/{document_id}/status", response_model=IngestStatus)
async def upload_status(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> IngestStatus:
    return await ingest_service.get_status(db, user.id, document_id)
