"""Decides how ingestion work is executed.

Two modes, both real:

- ``inline``  runs the job in a FastAPI background task, in the API process.
  No Redis, no worker — the single-service deployment.
- ``queue``   hands the job to an arq worker over Redis, so ingestion scales
  independently of the API.

Inline is the default because no free host offers an always-on background
worker. The tradeoff is that a very large document competes with request
handling, and an API restart mid-ingest loses that job (the document stays at
``processing`` until re-ingested).
"""

import logging
import uuid

from fastapi import BackgroundTasks

from app.core.config import settings

logger = logging.getLogger(__name__)


async def _run_inline(document_id: uuid.UUID, job_id: uuid.UUID) -> None:
    # Imported here to keep worker imports out of the request path.
    from app.workers.tasks.ingest import ingest_document

    try:
        await ingest_document({}, str(document_id), str(job_id))
    except Exception:
        # ingest_document already recorded the failure on the job and document
        # rows; swallowing here stops it from surfacing as an unhandled task error.
        logger.exception("inline ingest failed for document %s", document_id)


async def dispatch_ingest(
    background: BackgroundTasks, document_id: uuid.UUID, job_id: uuid.UUID
) -> None:
    if settings.INGEST_MODE == "queue":
        from app.workers.queue import enqueue_ingest

        await enqueue_ingest(document_id, job_id)
        return

    background.add_task(_run_inline, document_id, job_id)
