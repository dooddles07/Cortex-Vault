import logging
import uuid

from app.db.session import SessionLocal
from app.models import Job
from app.services.ingest_service import run_ingest

logger = logging.getLogger(__name__)


async def ingest_document(ctx: dict, document_id: str, job_id: str) -> int:
    async with SessionLocal() as db:
        job = await db.get(Job, uuid.UUID(job_id))
        if job:
            job.status = "processing"
            job.attempts += 1
            await db.commit()
        try:
            count = await run_ingest(db, uuid.UUID(document_id))
        except Exception as exc:
            logger.exception("ingest failed for document %s", document_id)
            if job:
                job.status = "failed"
                job.error = str(exc)[:2000]
                await db.commit()
            raise
        if job:
            job.status = "completed"
            await db.commit()
        return count
