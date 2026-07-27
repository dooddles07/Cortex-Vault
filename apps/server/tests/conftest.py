import os
import pathlib

from tests.helpers import PG, TEST_DB, admin_url, database_available

# Integration tests use a dedicated database so a local dev vault is never truncated.
os.environ.setdefault("DATABASE_URL", f"postgresql+asyncpg://{PG}/{TEST_DB}")
os.environ.setdefault("DATABASE_URL_SYNC", f"postgresql+psycopg2://{PG}/{TEST_DB}")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_SECRET", "test-secret")

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

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
from app.core.config import settings

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
    """Register a fresh user and return its Authorization header."""

    def _make() -> dict[str, str]:
        email = f"t-{uuid.uuid4().hex[:12]}@cortexvault-test.com"
        response = client.post(
            "/api/v1/auth/sign-up", json={"email": email, "password": "TestPassw0rd!123"}
        )
        assert response.status_code == 201, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _make
