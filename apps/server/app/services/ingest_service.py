import hashlib
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Chunk, Document, Job
from app.rag.chunking import chunk_text
from app.rag.embeddings import embed_texts
from app.rag.extraction import extract_text
from app.schemas.upload import IngestStatus
from app.storage.r2 import get_original

RETRYABLE_STATUSES = {"failed", "needs_ocr", "unsupported", "skipped_empty"}


async def queue_ingest(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> Job:
    job = Job(user_id=user_id, document_id=document_id, type="ingest", status="queued")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def run_ingest(db: AsyncSession, document_id: uuid.UUID) -> int:
    """Chunk + embed a document. Idempotent: replaces existing chunks.

    Locks the document row for the duration of the ingest so two concurrent
    ingest attempts on the same document (e.g. an upload followed immediately
    by a manual retry) serialize instead of racing on the delete-then-insert
    of its chunks — the second call blocks here until the first commits, then
    proceeds against the now-updated row (and the embedding-cache check below
    will usually short-circuit it).
    """
    doc = await db.scalar(
        select(Document).where(Document.id == document_id).with_for_update()
    )
    if not doc:
        raise NotFoundError("Document")
    if not doc.content:
        doc.ingest_status = "skipped_empty"
        await db.commit()
        return 0

    new_hash = hashlib.sha256(doc.content.encode()).hexdigest()

    # Embedding cache: if this exact content was already indexed, re-embedding
    # is pure waste against a free daily provider quota. Only short-circuits
    # when chunks still actually exist — a hash match with no chunks (e.g. a
    # prior run failed after computing the hash but before writing chunks)
    # must still fall through and embed for real.
    if new_hash == doc.content_hash and doc.ingest_status == "indexed":
        existing = await db.scalar(
            select(func.count()).select_from(Chunk).where(Chunk.document_id == document_id)
        )
        if existing:
            return existing

    doc.ingest_status = "processing"
    doc.content_hash = new_hash
    await db.commit()

    # Self-contained failure handling: a caller that forgets to catch and
    # mark the document failed (unlike the worker, which does today) must
    # not leave it reporting "processing" forever.
    try:
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
    except Exception:
        await db.rollback()
        doc.ingest_status = "failed"
        await db.commit()
        raise


async def prepare_retry(db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID) -> Document:
    """Prepares a document stuck in a terminal non-indexed state for another
    ingest pass. If content was already extracted (a chunk/embed failure), it
    is left as-is for the caller to re-queue. Otherwise re-downloads the
    original from storage and re-extracts — the same path that can turn a
    needs_ocr scan into searchable text once tesseract is available. Raises
    ConflictError if there is nothing to retry from (no content and no
    stored original)."""
    doc = await db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if not doc:
        raise NotFoundError("Document")
    if doc.ingest_status not in RETRYABLE_STATUSES:
        raise ConflictError("This document is not in a retryable state")
    if doc.content:
        return doc

    raw = await get_original(doc.file_path)
    if raw is None:
        raise ConflictError("No stored original to retry from — re-upload the file")

    parsed = await extract_text(raw, "", doc.title)
    doc.type = parsed.doc_type
    if not parsed.content:
        doc.ingest_status = parsed.status
        await db.commit()
        return doc

    doc.content = parsed.content
    await db.commit()
    return doc


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
