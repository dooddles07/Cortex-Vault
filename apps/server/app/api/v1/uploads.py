import uuid

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.api.limits import UploadLimit
from app.core.config import settings
from app.rag.extraction import extract_text
from app.schemas.document import DocumentCreate
from app.schemas.upload import IngestStatus, UploadAccepted
from app.services import document_service, ingest_service
from app.services.dispatch import dispatch_ingest
from app.storage.r2 import store_original

router = APIRouter(prefix="/uploads", tags=["uploads"])

_CHUNK = 1024 * 1024


async def _read_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read in chunks so an oversized upload is rejected before it is buffered."""
    buffer = bytearray()
    while chunk := await file.read(_CHUNK):
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            # Literal 413: Starlette renamed the constant, so the name is unstable.
            raise HTTPException(413, f"File exceeds the {max_bytes // (1024 * 1024)}MB limit")
    return bytes(buffer)


@router.post(
    "",
    response_model=UploadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[UploadLimit],
)
async def upload(
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
    file: UploadFile = File(...),
) -> UploadAccepted:
    raw = await _read_capped(file, settings.MAX_UPLOAD_BYTES)
    filename = file.filename or "Untitled"
    parsed = await extract_text(raw, file.content_type or "", filename)

    doc = await document_service.create_document(
        db,
        user.id,
        DocumentCreate(title=filename, type=parsed.doc_type, content=parsed.content),
    )

    file_path = await store_original(
        str(user.id), str(doc.id), filename, raw, file.content_type or ""
    )
    if file_path:
        doc = await document_service.set_file_path(db, doc, file_path)

    # Only text-bearing documents are worth queueing; the rest carry a terminal
    # status explaining why they will never be searchable.
    if parsed.content:
        job = await ingest_service.queue_ingest(db, user.id, doc.id)
        await dispatch_ingest(background, doc.id, job.id)
        job_id = job.id
    else:
        await document_service.set_ingest_status(db, doc, parsed.status)
        job_id = None

    return UploadAccepted(document_id=doc.id, job_id=job_id, ingest_status=doc.ingest_status)


@router.get("/{document_id}/status", response_model=IngestStatus)
async def upload_status(document_id: uuid.UUID, user: CurrentUser, db: DbSession) -> IngestStatus:
    return await ingest_service.get_status(db, user.id, document_id)
