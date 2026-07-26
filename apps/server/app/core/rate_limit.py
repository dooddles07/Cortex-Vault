"""Fixed-window rate limiting, Redis-backed when available.

Fixed window rather than a sliding log: one INCR plus one EXPIRE per request,
no per-request set to trim. The tradeoff is burstiness at a window boundary
(up to 2x the limit across two adjacent windows), which is acceptable for
abuse control.

Without REDIS_URL the counters live in this process. That is correct for a
single-instance deployment and wrong for several: each instance would then
enforce its own budget, so the effective limit is the configured value times
the instance count.
"""

import logging
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis = None
_local: dict[str, int] = {}
_local_window: int | None = None


def _get_redis():
    global _redis
    if _redis is None:
        from redis.asyncio import Redis

        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


@dataclass(frozen=True)
class Limit:
    requests: int
    window_seconds: int
    name: str


def client_ip(request: Request) -> str:
    """Behind a proxy the socket peer is the proxy itself.

    X-Forwarded-For is client-controlled and only trustworthy because the
    platform overwrites it; the left-most entry is the original client.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _count_local(key: str, window: int) -> int:
    """Whole-dict reset per window keeps memory bounded without a sweeper."""
    global _local, _local_window
    if _local_window != window:
        _local = {}
        _local_window = window
    _local[key] = _local.get(key, 0) + 1
    return _local[key]


async def enforce(bucket: str, identity: str, limit: Limit) -> None:
    """Raise 429 when the caller has exhausted its window.

    Fails open on a Redis error: losing the limiter is preferable to losing the
    API, but it does mean an outage removes protection.
    """
    window = int(time.time()) // limit.window_seconds
    key = f"rl:{bucket}:{identity}:{window}"

    if settings.REDIS_URL:
        try:
            redis = _get_redis()
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, limit.window_seconds)
        except Exception:
            logger.warning("rate limiter unavailable; allowing request", exc_info=True)
            return
    else:
        count = _count_local(key, window)

    if count > limit.requests:
        retry_after = limit.window_seconds - (int(time.time()) % limit.window_seconds)
        raise HTTPException(
            429,
            detail=f"Too many {limit.name} requests. Try again in {retry_after}s.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit.requests),
                "X-RateLimit-Remaining": "0",
            },
        )
