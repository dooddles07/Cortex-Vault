import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.rag.retrieval import SearchFilters, hybrid_search
from app.schemas.search import SearchHit, SearchResponse


async def search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    mode: str = "hybrid",
    limit: int = 20,
    filters: SearchFilters | None = None,
) -> SearchResponse:
    hits = await hybrid_search(db, user_id, query, limit, mode, filters)
    return SearchResponse(
        query=query,
        mode=mode,
        hits=[
            SearchHit(
                chunk_id=h.chunk_id,
                document_id=h.document_id,
                document_title=h.document_title,
                content=h.content,
                score=h.score,
            )
            for h in hits
        ],
    )
