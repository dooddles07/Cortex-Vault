import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk, Conversation, Document


async def summary(db: AsyncSession, user_id: uuid.UUID) -> dict[str, object]:
    doc_count = await db.scalar(
        select(func.count())
        .select_from(Document)
        .where(Document.user_id == user_id, Document.deleted_at.is_(None))
    )
    chunk_count = await db.scalar(
        select(func.count()).select_from(Chunk).where(Chunk.user_id == user_id)
    )
    convo_count = await db.scalar(
        select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)
    )
    recent = await db.scalars(
        select(Document)
        .where(Document.user_id == user_id, Document.deleted_at.is_(None))
        .order_by(Document.updated_at.desc())
        .limit(5)
    )
    return {
        "documents": doc_count or 0,
        "chunks": chunk_count or 0,
        "conversations": convo_count or 0,
        "recent": [{"id": str(d.id), "title": d.title, "type": d.type} for d in recent],
    }
