import logging
import uuid

from app.db.session import SessionLocal
from app.models import Job
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
            # run_ingest already marks the document failed and commits that
            # itself; this only needs to record the job side.
            if job:
                job.status = "failed"
                job.error = str(exc)[:2000]
                await db.commit()
            raise

        if job:
            job.status = "completed"
            await db.commit()
        return count
