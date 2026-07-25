import os

# Settings are read at import time, so defaults must exist before app modules load.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/cortexvault")
os.environ.setdefault("DATABASE_URL_SYNC", "postgresql+psycopg2://postgres:postgres@localhost:5432/cortexvault")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)
