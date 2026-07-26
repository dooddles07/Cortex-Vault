from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.api.limits import UploadLimit
from app.rag.bookmarks import BookmarkFetchError, fetch_readable
from app.schemas.bookmark import BookmarkCreate
from app.schemas.document import DocumentCreate
from app.schemas.upload import UploadAccepted
from app.services import document_service, ingest_service
from app.services.dispatch import dispatch_ingest

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post(
    "",
    response_model=UploadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[UploadLimit],
)
async def save_bookmark(
    payload: BookmarkCreate,
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
) -> UploadAccepted:
    try:
        title, content = await fetch_readable(payload.url)
    except BookmarkFetchError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    doc = await document_service.create_document(
        db,
        user.id,
        DocumentCreate(
            title=title or payload.url,
            type="bookmark",
            content=content,
            source_url=payload.url,
            folder_id=payload.folder_id,
        ),
    )
    job = await ingest_service.queue_ingest(db, user.id, doc.id)
    await dispatch_ingest(background, doc.id, job.id)
    return UploadAccepted(document_id=doc.id, job_id=job.id, ingest_status=doc.ingest_status)
