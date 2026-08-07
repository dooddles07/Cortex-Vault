import secrets

from fastapi import APIRouter, Header, HTTPException, status

from app.api.deps import DbSession
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.services.document_service import purge_expired_trash
from app.services.session_service import purge_old_sessions

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/purge")
async def purge(
    db: DbSession,
    x_internal_token: str | None = Header(default=None),
) -> dict[str, int]:
    """Called by an external cron trigger (see infra/purge-cron) since no free
    host offers one. Shared-secret gated, not JWT — there is no calling user.
    Unset INTERNAL_PURGE_TOKEN 404s rather than 401, so a deployment that
    hasn't opted in doesn't expose an unauthenticated route that merely
    rejects every request."""
    if not settings.INTERNAL_PURGE_TOKEN:
        raise NotFoundError()
    if not x_internal_token or not secrets.compare_digest(
        x_internal_token, settings.INTERNAL_PURGE_TOKEN
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid internal token")

    trashed = await purge_expired_trash(db)
    sessions = await purge_old_sessions(db)
    return {"trashed_documents": trashed, "sessions": sessions}
