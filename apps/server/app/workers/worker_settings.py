"""arq worker entrypoint. Only needed when INGEST_MODE=queue.

Imported solely by the worker process, so evaluating redis_settings() here
fails loudly at startup when REDIS_URL is missing rather than at first job.
"""

from app.core.logging import configure_logging
from app.workers.queue import redis_settings
from app.workers.tasks import ingest_document

configure_logging()


class WorkerSettings:
    functions = [ingest_document]
    redis_settings = redis_settings()
    max_tries = 3
    job_timeout = 900
