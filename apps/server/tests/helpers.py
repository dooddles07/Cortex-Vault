"""Shared test utilities. Kept out of conftest so test modules can import them
without relying on conftest being importable as a module."""

import functools
import hashlib
import os
import struct
from collections.abc import AsyncIterator

import pytest

TEST_DB = os.environ.get("TEST_DB_NAME", "cortexvault_test")
PG = os.environ.get("TEST_PG", "postgres:postgres@localhost:5432")


def admin_url() -> str:
    return f"postgresql+psycopg2://{PG}/postgres"


@functools.cache
def database_available() -> bool:
    """Cached: probed per-test it cost a 3s connect timeout on every skip."""
    try:
        import sqlalchemy

        engine = sqlalchemy.create_engine(admin_url(), connect_args={"connect_timeout": 3})
        with engine.connect():
            return True
    except Exception:
        return False


requires_db = pytest.mark.skipif(
    not database_available(),
    reason="Postgres unavailable — run `docker compose up -d` in apps/server",
)


def fake_vector(text: str, dim: int) -> list[float]:
    """Stable pseudo-embedding derived from the text, so identical input always
    retrieves identically without a network call."""
    digest = hashlib.sha256(text.lower().encode()).digest()
    repeats = (dim * 4 // len(digest)) + 1
    raw = (digest * repeats)[: dim * 4]
    values = struct.unpack(f"{dim}f", raw)
    norm = sum(v * v for v in values) ** 0.5 or 1.0
    return [v / norm for v in values]


class FakeEmbeddingProvider:
    def __init__(self, dim: int) -> None:
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [fake_vector(t, self.dim) for t in texts]


class FakeChatProvider:
    def __init__(self, tokens: list[str] | None = None, fail_after: int | None = None) -> None:
        self.tokens = tokens or ["Answer ", "grounded ", "in ", "context ", "[1]."]
        self.fail_after = fail_after

    async def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        for i, token in enumerate(self.tokens):
            if self.fail_after is not None and i >= self.fail_after:
                raise RuntimeError("simulated provider failure")
            yield token
