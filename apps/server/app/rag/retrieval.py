import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Chunk, Document
from app.rag.embeddings import embed_query


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    score: float


async def hybrid_search(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    limit: int | None = None,
    mode: str = "hybrid",
) -> list[RetrievedChunk]:
    """Vector similarity, Postgres full-text, or both fused by reciprocal rank."""
    top_k = limit or settings.RETRIEVAL_TOP_K
    if mode == "semantic":
        return await _vector_search(db, user_id, query, top_k)
    if mode == "keyword":
        return await _keyword_search(db, user_id, query, top_k)

    vector_hits = await _vector_search(db, user_id, query, top_k)
    keyword_hits = await _keyword_search(db, user_id, query, top_k)
    return _reciprocal_rank_fusion(vector_hits, keyword_hits)[:top_k]


async def _vector_search(
    db: AsyncSession, user_id: uuid.UUID, query: str, top_k: int
) -> list[RetrievedChunk]:
    embedding = await embed_query(query)
    distance = Chunk.embedding.cosine_distance(embedding)
    stmt = (
        select(Chunk.id, Chunk.document_id, Document.title, Chunk.content, distance.label("d"))
        .join(Document, Document.id == Chunk.document_id)
        .where(Chunk.user_id == user_id, Document.deleted_at.is_(None), Chunk.embedding.isnot(None))
        .order_by(distance)
        .limit(top_k)
    )
    rows = (await db.execute(stmt)).all()
    return [RetrievedChunk(r[0], r[1], r[2], r[3], 1.0 - float(r[4])) for r in rows]


async def _keyword_search(
    db: AsyncSession, user_id: uuid.UUID, query: str, top_k: int
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
