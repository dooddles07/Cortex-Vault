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


def _init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )


_init_sentry()


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
    from app.services.session_service import purge_old_sessions

    try:
        async with SessionLocal() as db:
            await purge_expired_trash(db)
            await purge_old_sessions(db)
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


@app.middleware("http")
async def security_headers(request, call_next):
    """A JSON API serves no page that needs script/style execution, except
    /docs (Swagger UI), which needs its own inline assets — so CSP there is
    deliberately looser than everywhere else."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    if request.url.path in {"/docs", "/openapi.json"}:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: https:; "
            "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
            "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'"
        )
    else:
        response.headers["Content-Security-Policy"] = "default-src 'none'"
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENV}
