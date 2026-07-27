import uuid
from datetime import date

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.api.limits import SearchLimit
from app.rag.retrieval import SearchFilters
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse, dependencies=[SearchLimit])
async def search(
    user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1),
    mode: str = Query("hybrid", pattern="^(hybrid|semantic|keyword)$"),
    limit: int = Query(20, le=50),
    type: str | None = None,
    folder_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> SearchResponse:
    filters = SearchFilters(
        doc_type=type, folder_id=folder_id, tag_id=tag_id, date_from=date_from, date_to=date_to
    )
    return await search_service.search(db, user.id, q, mode, limit, filters)
