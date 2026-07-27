import os
import pathlib

from tests.helpers import PG, TEST_DB, admin_url, database_available

# Integration tests use a dedicated database so a local dev vault is never truncated.
os.environ.setdefault("DATABASE_URL", f"postgresql+asyncpg://{PG}/{TEST_DB}")
os.environ.setdefault("DATABASE_URL_SYNC", f"postgresql+psycopg2://{PG}/{TEST_DB}")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("JWT_SECRET", "test-secret")

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from tests.helpers import FakeChatProvider, FakeEmbeddingProvider

_HERE = pathlib.Path(__file__).parent.parent


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


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
    backdating a timestamp), bypassing the API."""
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
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
