import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.rate_limit import close_redis
from app.workers.queue import close_pool

configure_logging()
logger = logging.getLogger(__name__)


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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Starlette's default handler returns a bare 500 with nothing tying it back
    to a server log line. Sentry (if configured) already captures the exception
    with its own event id; this id is independent and always available, so a
    live-demo failure can still be traced from a screenshot alone."""
    request_id = uuid.uuid4().hex
    logger.exception("unhandled exception [request_id=%s]", request_id, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "request_id": request_id},
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
