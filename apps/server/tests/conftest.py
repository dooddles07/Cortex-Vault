import os
import pathlib

from tests.helpers import PG, TEST_DB, admin_url, database_available

# Integration tests use a dedicated database so a local dev vault is never truncated.
os.environ.setdefault("DATABASE_URL", f"postgresql+asyncpg://{PG}/{TEST_DB}")
os.environ.setdefault("DATABASE_URL_SYNC", f"postgresql+psycopg2://{PG}/{TEST_DB}")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("INTERNAL_PURGE_TOKEN", "test-internal-purge-token")

# Production-tuned rate limits are far too low for a full integration run,
# which signs up/chats/uploads across many tests sharing one bucket (every
# TestClient request reports the same fake client IP). test_rate_limit.py
# exercises the real limiter directly with its own explicit Limit(...)
# values, so raising these settings-driven ceilings doesn't weaken that
# coverage — it only stops the rest of the suite from tripping over it.
os.environ.setdefault("RATE_LIMIT_AUTH", "100000")
os.environ.setdefault("RATE_LIMIT_CHAT", "100000")
os.environ.setdefault("RATE_LIMIT_UPLOAD", "100000")
os.environ.setdefault("RATE_LIMIT_SEARCH", "100000")

# Forced blank, not just defaulted: a real credential in a developer's local
# .env must never leak into a test run. AI providers are already safe from
# this — fake_providers replaces the factory functions entirely — but
# Sentry, Resend, and R2 are called directly with no swappable factory, so a
# real key in .env means a real Sentry event / real email / real R2 write
# during `pytest`. This is exactly how a real SENTRY_DSN in .env ended up
# sending real test exceptions to production Sentry the first time this
# integration shipped. os.environ.setdefault only applies because these
# names aren't already in the process environment (they live in .env, which
# pydantic-settings loads with lower precedence than real OS env vars) — so
# this reliably wins regardless of what .env contains.
for _key in (
    "SENTRY_DSN",
    "RESEND_API_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
):
    os.environ.setdefault(_key, "")

import uuid  # noqa: E402
from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

# Swap in a NullPool engine BEFORE app.main is imported, because chat_service,
# workers.tasks.ingest and db.session all bind `SessionLocal` at module import
# time — patching later would only reach whichever reference was rebound.
#
# Why NullPool: tests drive the app from two different event loops. Requests run
# on the TestClient's blocking portal; async tests and fixtures run on
# pytest-asyncio's loop. A pooled asyncpg connection is bound to the loop that
# created it, so any reuse across that boundary fails with "Future attached to a
# different loop" — and, worse, poisons the pooled connection for whichever test
# draws it next. NullPool opens a fresh connection per checkout and closes it on
# release, so a connection can never outlive the loop it was made on.
import app.db.session as _db_session  # noqa: E402
from app.core.config import settings  # noqa: E402

_db_session.engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
_db_session.SessionLocal = async_sessionmaker(_db_session.engine, expire_on_commit=False)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from tests.helpers import FakeChatProvider, FakeEmbeddingProvider  # noqa: E402

_HERE = pathlib.Path(__file__).parent.parent


@pytest.fixture(scope="session")
def client(_migrated_database) -> Iterator[TestClient]:
    """Entered as a context manager, which is load-bearing rather than stylistic.

    Outside a `with` block, `TestClient` builds a **fresh event loop per
    request** (`_portal_factory` starts a new blocking portal each call). The
    app's connection pool then caches asyncpg connections bound to the first
    request's loop, and the next request — on a different loop — trips
    `pool_pre_ping` with "Future attached to a different loop". Entering the
    context manager pins one portal, and therefore one loop, for the whole
    session. It also runs the app's lifespan, which is closer to production.

    Depends on `_migrated_database` so the schema exists before lifespan
    startup touches it.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session", autouse=True)
def _migrated_database():
    """Create the test database if absent, then run the real migrations so the
    schema under test is the one that ships (including the vector extension)."""
    if not database_available():
        yield
        return

    import sqlalchemy
    from alembic.config import Config

    from alembic import command

    admin = sqlalchemy.create_engine(admin_url(), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.execute(
            sqlalchemy.text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB}
        ).scalar()
        if not exists:
            conn.execute(sqlalchemy.text(f'CREATE DATABASE "{TEST_DB}"'))
    admin.dispose()

    config = Config(str(_HERE / "alembic.ini"))
    config.set_main_option("script_location", str(_HERE / "alembic"))
    command.upgrade(config, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_migrated_database):
    """Truncate between tests so each starts from an empty vault."""
    if not database_available():
        yield
        return

    import sqlalchemy

    engine = sqlalchemy.create_engine(settings.DATABASE_URL_SYNC)
    with engine.begin() as conn:
        conn.execute(
            sqlalchemy.text(
                "TRUNCATE users, folders, tags, documents, document_tags, chunks, "
                "conversations, messages, message_citations, jobs RESTART IDENTITY CASCADE"
            )
        )
    engine.dispose()
    yield


@pytest.fixture(autouse=True)
def fake_providers(monkeypatch):
    """Tests must never call a real AI provider. Patched at every import site,
    since modules bind these factories at import time."""
    chat = FakeChatProvider()
    embedding = FakeEmbeddingProvider(settings.EMBEDDING_DIM)

    monkeypatch.setattr("app.rag.embeddings.get_embedding_provider", lambda *_: embedding)
    monkeypatch.setattr("app.services.chat_service.get_chat_provider", lambda *_: chat)
    return chat


@pytest.fixture
def inline_worker(monkeypatch):
    """Run the arq task synchronously on dispatch, so the full ingest path is
    exercised without a running worker or Redis — regardless of INGEST_MODE."""
    from app.workers.tasks.ingest import ingest_document

    async def _run(_background, document_id, job_id):
        await ingest_document({}, str(document_id), str(job_id))

    for module in ("app.api.v1.documents", "app.api.v1.uploads", "app.api.v1.bookmarks"):
        monkeypatch.setattr(f"{module}.dispatch_ingest", _run)


@pytest.fixture
async def db_session():
    """Raw AsyncSession for tests that need to manipulate rows directly (e.g.
    backdating a timestamp), bypassing the API.

    Safe to share the app's session factory only because the test engine uses
    NullPool — see the note at the top of this file. This fixture runs on
    pytest-asyncio's loop while requests run on the TestClient's portal loop,
    which pooled connections would not survive.
    """
    async with _db_session.SessionLocal() as session:
        yield session


@pytest.fixture
def auth(client: TestClient):
    """Register a fresh, pre-verified user and return its Authorization
    header. Verified immediately via a direct DB write, bypassing the real
    verify-email flow — most tests exercise the post-verification happy
    path, and re-verifying through email in every test would mean either
    mocking Resend everywhere or reading the token out of the database
    anyway. test_integration_auth.py exercises the real flow directly, and
    `unverified_auth` below covers the gated (pre-verification) state."""
    import sqlalchemy

    def _make() -> dict[str, str]:
        email = f"t-{uuid.uuid4().hex[:12]}@cortexvault-test.com"
        response = client.post(
            "/api/v1/auth/sign-up", json={"email": email, "password": "TestPassw0rd!123"}
        )
        assert response.status_code == 201, response.text

        engine = sqlalchemy.create_engine(settings.DATABASE_URL_SYNC)
        with engine.begin() as conn:
            conn.execute(
                sqlalchemy.text("UPDATE users SET email_verified = true WHERE email = :email"),
                {"email": email},
            )
        engine.dispose()

        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make


@pytest.fixture
def unverified_auth(client: TestClient):
    """Register a fresh user without verifying it — for testing the
    email-verification gate itself (see require_verified_email)."""

    def _make() -> dict[str, str]:
        email = f"t-{uuid.uuid4().hex[:12]}@cortexvault-test.com"
        response = client.post(
            "/api/v1/auth/sign-up", json={"email": email, "password": "TestPassw0rd!123"}
        )
        assert response.status_code == 201, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make
