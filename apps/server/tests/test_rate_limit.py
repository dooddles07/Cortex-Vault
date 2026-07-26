import pytest
from fastapi import HTTPException, Request

import app.core.rate_limit as rl
from app.core.rate_limit import Limit, client_ip, enforce


class FakeRedis:
    """Minimal INCR/EXPIRE stand-in so the limiter can be tested offline."""

    def __init__(self) -> None:
        self.counts: dict[str, int] = {}
        self.expiries: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expiries[key] = seconds


class BrokenRedis:
    async def incr(self, key: str) -> int:
        raise ConnectionError("redis is down")

    async def expire(self, key: str, seconds: int) -> None:
        raise ConnectionError("redis is down")


@pytest.fixture
def redis(monkeypatch) -> FakeRedis:
    """Route the limiter through a fake Redis."""
    fake = FakeRedis()
    monkeypatch.setattr(rl.settings, "REDIS_URL", "redis://fake")
    monkeypatch.setattr(rl, "_get_redis", lambda: fake)
    return fake


@pytest.fixture
def in_memory(monkeypatch):
    """Route the limiter through the process-local counters."""
    monkeypatch.setattr(rl.settings, "REDIS_URL", None)
    monkeypatch.setattr(rl, "_local", {})
    monkeypatch.setattr(rl, "_local_window", None)


def _request(headers: dict[str, str] | None = None, host: str = "10.0.0.1") -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (host, 1234),
    }
    return Request(scope)


# --- Redis-backed path -----------------------------------------------------


async def test_requests_under_the_limit_pass(redis):
    for _ in range(3):
        await enforce("bucket", "user-1", Limit(3, 60, "test"))


async def test_exceeding_the_limit_raises_429(redis):
    limit = Limit(2, 60, "test")
    await enforce("bucket", "user-1", limit)
    await enforce("bucket", "user-1", limit)

    with pytest.raises(HTTPException) as exc:
        await enforce("bucket", "user-1", limit)

    assert exc.value.status_code == 429
    assert "Retry-After" in (exc.value.headers or {})


async def test_identities_have_separate_budgets(redis):
    limit = Limit(1, 60, "test")
    await enforce("bucket", "user-1", limit)
    # A second user must not be blocked by the first user's usage.
    await enforce("bucket", "user-2", limit)


async def test_buckets_are_independent(redis):
    limit = Limit(1, 60, "test")
    await enforce("chat", "user-1", limit)
    await enforce("search", "user-1", limit)


async def test_expiry_is_set_once_per_window(redis):
    limit = Limit(5, 60, "test")
    await enforce("bucket", "user-1", limit)
    await enforce("bucket", "user-1", limit)

    # Without a TTL the key would leak forever; re-setting it each request
    # would slide the window and never let it reset.
    assert list(redis.expiries.values()) == [60]


async def test_limiter_fails_open_when_redis_is_down(monkeypatch):
    """Documented tradeoff: an outage removes protection rather than the API."""
    monkeypatch.setattr(rl.settings, "REDIS_URL", "redis://fake")
    monkeypatch.setattr(rl, "_get_redis", lambda: BrokenRedis())

    await enforce("bucket", "user-1", Limit(1, 60, "test"))
    await enforce("bucket", "user-1", Limit(1, 60, "test"))


# --- In-memory path (no Redis configured) ----------------------------------


async def test_in_memory_limiter_enforces_without_redis(in_memory):
    limit = Limit(2, 60, "test")
    await enforce("bucket", "user-1", limit)
    await enforce("bucket", "user-1", limit)

    with pytest.raises(HTTPException) as exc:
        await enforce("bucket", "user-1", limit)
    assert exc.value.status_code == 429


async def test_in_memory_identities_are_separate(in_memory):
    limit = Limit(1, 60, "test")
    await enforce("bucket", "user-1", limit)
    await enforce("bucket", "user-2", limit)


async def test_in_memory_state_resets_on_a_new_window(in_memory, monkeypatch):
    """Counters must not grow without bound across windows."""
    limit = Limit(1, 60, "test")
    monkeypatch.setattr(rl.time, "time", lambda: 0)
    await enforce("bucket", "user-1", limit)

    monkeypatch.setattr(rl.time, "time", lambda: 600)
    await enforce("bucket", "user-1", limit)
    assert len(rl._local) == 1


# --- Client IP -------------------------------------------------------------


def test_client_ip_prefers_forwarded_header():
    request = _request({"x-forwarded-for": "203.0.113.7, 70.41.3.18"})
    assert client_ip(request) == "203.0.113.7"


def test_client_ip_falls_back_to_socket_peer():
    assert client_ip(_request(host="192.0.2.9")) == "192.0.2.9"
