import uuid
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Chunk, Document, DocumentTag
from app.rag.embeddings import embed_query


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    score: float


@dataclass
class SearchFilters:
    doc_type: str | None = None
    folder_id: uuid.UUID | None = None
    tag_id: uuid.UUID | None = None
    date_from: date | None = None
    date_to: date | None = None

    @property
    def is_empty(self) -> bool:
        return not any(
            (self.doc_type, self.folder_id, self.tag_id, self.date_from, self.date_to)
        )


def _apply_filters(stmt: Select, filters: SearchFilters | None) -> Select:
    """Scope a chunk query by document metadata. Retrieval always filters by
    owner and trash first — this narrows further, so a filter can only ever
    shrink the result set, never leak across users."""
    if filters is None or filters.is_empty:
        return stmt
    if filters.doc_type:
        stmt = stmt.where(Document.type == filters.doc_type)
    if filters.folder_id:
        stmt = stmt.where(Document.folder_id == filters.folder_id)
    if filters.date_from:
        stmt = stmt.where(Document.created_at >= filters.date_from)
    if filters.date_to:
        # Inclusive of the whole day, not just midnight.
        stmt = stmt.where(Document.created_at < filters.date_to + timedelta(days=1))
    if filters.tag_id:
        stmt = stmt.where(
            Document.id.in_(
                select(DocumentTag.document_id).where(DocumentTag.tag_id == filters.tag_id)
            )
        )
    return stmt


async def hybrid_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    limit: int | None = None,
    mode: str = "hybrid",
    filters: SearchFilters | None = None,
) -> list[RetrievedChunk]:
    """Vector similarity, Postgres full-text, or both fused by reciprocal rank."""
    top_k = limit or settings.RETRIEVAL_TOP_K
    if mode == "semantic":
        return await _vector_search(db, user_id, query, top_k, filters)
    if mode == "keyword":
        return await _keyword_search(db, user_id, query, top_k, filters)

    vector_hits = await _vector_search(db, user_id, query, top_k, filters)
    keyword_hits = await _keyword_search(db, user_id, query, top_k, filters)
    return _reciprocal_rank_fusion(vector_hits, keyword_hits)[:top_k]


async def _vector_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int,
    filters: SearchFilters | None = None,
) -> list[RetrievedChunk]:
    embedding = await embed_query(query)
    distance = Chunk.embedding.cosine_distance(embedding)
    stmt = (
        select(Chunk.id, Chunk.document_id, Document.title, Chunk.content, distance.label("d"))
        .join(Document, Document.id == Chunk.document_id)
        .where(
            Chunk.user_id == user_id,
            Document.deleted_at.is_(None),
            Chunk.embedding.isnot(None),
            distance <= 1.0 - settings.RETRIEVAL_MIN_SCORE,
        )
        .order_by(distance)
        .limit(top_k)
    )
    stmt = _apply_filters(stmt, filters)
    rows = (await db.execute(stmt)).all()
    return [RetrievedChunk(r[0], r[1], r[2], r[3], 1.0 - float(r[4])) for r in rows]


async def _keyword_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    top_k: int,
    filters: SearchFilters | None = None,
) -> list[RetrievedChunk]:
    ts_query = func.plainto_tsquery("english", query)
    ts_vector = func.to_tsvector("english", Chunk.content)
    rank = func.ts_rank(ts_vector, ts_query)
    stmt = (
        select(Chunk.id, Chunk.document_id, Document.title, Chunk.content, rank.label("r"))
        .join(Document, Document.id == Chunk.document_id)
        .where(
            Chunk.user_id == user_id,
            Document.deleted_at.is_(None),
            ts_vector.op("@@")(ts_query),
        )
        .order_by(rank.desc())
        .limit(top_k)
    )
    stmt = _apply_filters(stmt, filters)
    rows = (await db.execute(stmt)).all()
    return [RetrievedChunk(r[0], r[1], r[2], r[3], float(r[4])) for r in rows]


def _reciprocal_rank_fusion(
    *result_sets: list[RetrievedChunk], k: int = 60
) -> list[RetrievedChunk]:
    scores: dict[uuid.UUID, float] = {}
    by_id: dict[uuid.UUID, RetrievedChunk] = {}
    for results in result_sets:
        for rank, hit in enumerate(results):
            scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + 1.0 / (k + rank + 1)
            by_id.setdefault(hit.chunk_id, hit)
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return [
        RetrievedChunk(
            by_id[cid].chunk_id,
            by_id[cid].document_id,
            by_id[cid].document_title,
            by_id[cid].content,
            score,
        )
        for cid, score in ranked
    ]
