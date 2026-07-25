import uuid

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import settings

redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

_pool: ArqRedis | None = None


async def get_pool() -> ArqRedis:
    """One shared pool. Creating one per enqueue churns connections and adds a
    round trip to every write that triggers ingestion."""
    global _pool
    if _pool is None:
        _pool = await create_pool(redis_settings)
    return _pool


async def enqueue_ingest(document_id: uuid.UUID, job_id: uuid.UUID) -> None:
    pool = await get_pool()
    await pool.enqueue_job("ingest_document", str(document_id), str(job_id))


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
