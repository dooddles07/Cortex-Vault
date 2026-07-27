from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import close_redis
from app.workers.queue import close_pool

configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await _purge_trash_on_startup()
    yield
    if settings.INGEST_MODE == "queue":
        await close_pool()
    await close_redis()


async def _purge_trash_on_startup() -> None:
    # No scheduler on the free tier — this is the closest thing to one.
    # Failure must never block boot.
    import logging

    from app.db.session import SessionLocal
    from app.services.document_service import purge_expired_trash

    try:
        async with SessionLocal() as db:
            await purge_expired_trash(db)
    except Exception:
        logging.getLogger(__name__).exception("startup trash purge failed")


app = FastAPI(title="CortexVault API", version="0.1.0", docs_url="/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENV}
