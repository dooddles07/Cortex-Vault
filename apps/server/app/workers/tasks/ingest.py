import logging
import uuid

from app.db.session import SessionLocal
from app.models import Document, Job
from app.services.ingest_service import run_ingest

logger = logging.getLogger(__name__)


async def ingest_document(ctx: dict, document_id: str, job_id: str) -> int:
    doc_uuid = uuid.UUID(document_id)
    async with SessionLocal() as db:
        job = await db.get(Job, uuid.UUID(job_id))
        if job:
            job.status = "processing"
            job.attempts += 1
            await db.commit()

        try:
            count = await run_ingest(db, doc_uuid)
        except Exception as exc:
            logger.exception("ingest failed for document %s", document_id)
            # The session may hold a failed transaction; clear it before writing.
            await db.rollback()
            if job:
                job.status = "failed"
                job.error = str(exc)[:2000]
            doc = await db.get(Document, doc_uuid)
            if doc:
                # Otherwise the document reports "processing" forever.
                doc.ingest_status = "failed"
            await db.commit()
            raise

        if job:
            job.status = "completed"
            await db.commit()
        return count
