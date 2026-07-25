import hashlib
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Chunk, Document, Job
from app.rag.chunking import chunk_text
from app.rag.embeddings import embed_texts
from app.schemas.upload import IngestStatus


async def queue_ingest(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> Job:
    job = Job(user_id=user_id, document_id=document_id, type="ingest", status="queued")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def run_ingest(db: AsyncSession, document_id: uuid.UUID) -> int:
    """Chunk + embed a document. Idempotent: replaces existing chunks."""
    doc = await db.get(Document, document_id)
    if not doc:
        raise NotFoundError("Document")
    if not doc.content:
        doc.ingest_status = "skipped_empty"
        await db.commit()
        return 0

    doc.ingest_status = "processing"
    doc.content_hash = hashlib.sha256(doc.content.encode()).hexdigest()
    await db.commit()

    await db.execute(delete(Chunk).where(Chunk.document_id == document_id))

    texts = chunk_text(doc.content)
    vectors = await embed_texts(texts)
    db.add_all(
        Chunk(
            document_id=doc.id,
            user_id=doc.user_id,
            position=i,
            content=text,
            embedding=vector,
        )
        for i, (text, vector) in enumerate(zip(texts, vectors, strict=True))
    )
    doc.ingest_status = "indexed"
    await db.commit()
    return len(texts)


async def get_status(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
) -> IngestStatus:
    doc = await db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if not doc:
        raise NotFoundError("Document")
    job = await db.scalar(
        select(Job)
        .where(Job.document_id == document_id)
        .order_by(Job.created_at.desc())
        .limit(1)
    )
    return IngestStatus(
        document_id=doc.id,
        ingest_status=doc.ingest_status,
        job_status=job.status if job else None,
        error=job.error if job else None,
    )
