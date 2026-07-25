from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1),
    mode: str = Query("hybrid", pattern="^(hybrid|semantic|keyword)$"),
    limit: int = Query(20, le=50),
) -> SearchResponse:
    return await search_service.search(db, user.id, q, mode, limit)
