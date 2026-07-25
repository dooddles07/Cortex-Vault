from app.core.logging import configure_logging
from app.workers.queue import redis_settings
from app.workers.tasks import ingest_document

configure_logging()


class WorkerSettings:
    functions = [ingest_document]
    redis_settings = redis_settings
    max_tries = 3
    job_timeout = 900
