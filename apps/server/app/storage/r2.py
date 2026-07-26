"""Cloudflare R2 object storage for original uploads.

Optional, same graceful-degradation pattern as REDIS_URL: without the R2_*
settings configured, `store_original` returns None and the caller proceeds
without a stored original, which is today's behavior (text extracted, file
discarded). This means the app runs with zero external storage cost until
R2 credentials are actually set.
"""

import logging
from functools import lru_cache

from fastapi.concurrency import run_in_threadpool

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET_NAME
    )


@lru_cache
def _client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def _put(key: str, data: bytes, content_type: str) -> None:
    _client().put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type or "application/octet-stream",
    )


async def store_original(
    user_id: str, document_id: str, filename: str, data: bytes, content_type: str
) -> str | None:
    """Upload the original file to R2. Returns the object key, or None if
    storage is unconfigured or the upload failed — never raises, so a storage
    outage cannot block ingestion."""
    if not is_configured():
        return None
    key = f"{user_id}/{document_id}/{filename}"
    try:
        await run_in_threadpool(_put, key, data, content_type)
    except Exception:
        logger.exception("R2 upload failed for %s", key)
        return None
    return key


def _delete(key: str) -> None:
    _client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)


async def delete_original(file_path: str | None) -> None:
    """Remove a stored original. Called on hard document delete so a deleted
    document does not go on occupying the free storage tier forever. Never
    raises — a storage outage must not block the delete the user asked for."""
    if not file_path or not is_configured():
        return
    try:
        await run_in_threadpool(_delete, file_path)
    except Exception:
        logger.exception("R2 delete failed for %s", file_path)
