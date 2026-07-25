import uuid

from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings

redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)


async def enqueue_ingest(document_id: uuid.UUID, job_id: uuid.UUID) -> None:
    pool = await create_pool(redis_settings)
    try:
        await pool.enqueue_job("ingest_document", str(document_id), str(job_id))
    finally:
        await pool.close()
