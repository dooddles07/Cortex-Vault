"""Import-time and startup checks. These catch the class of bug that only
appears on deploy: eager client construction, bad imports, missing config."""

import json


def test_app_imports_without_optional_provider_keys():
    import app.main  # noqa: F401


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_protected_route_requires_auth(client):
    assert client.get("/api/v1/me").status_code == 401


def test_openapi_schema_builds(client):
    assert client.get("/openapi.json").status_code == 200


def test_sentry_init_skipped_without_dsn(monkeypatch):
    import app.main
    from app.core.config import settings

    monkeypatch.setattr(settings, "SENTRY_DSN", None)
    monkeypatch.setattr(
        "sentry_sdk.init", lambda **_: (_ for _ in ()).throw(AssertionError("must not init"))
    )
    app.main._init_sentry()


def test_sentry_init_called_with_dsn(monkeypatch):
    import app.main
    from app.core.config import settings

    captured = {}
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://key@example.ingest.sentry.io/1")
    monkeypatch.setattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.1)
    monkeypatch.setattr("sentry_sdk.init", lambda **kw: captured.update(kw))

    app.main._init_sentry()

    assert captured["dsn"] == "https://key@example.ingest.sentry.io/1"
    assert captured["traces_sample_rate"] == 0.1


async def test_startup_trash_purge_never_crashes_boot(monkeypatch):
    """No scheduler exists on the free tier, so the trash purge runs
    opportunistically on API startup (see app/main.py) — it must never take
    the app down, including when the database itself is unreachable."""
    import app.main

    async def _boom(_db):
        raise RuntimeError("simulated database outage")

    monkeypatch.setattr("app.services.document_service.purge_expired_trash", _boom)

    await app.main._purge_trash_on_startup()


async def test_unhandled_exception_handler_returns_a_traceable_request_id():
    """A live-demo 500 with nothing to go on but a screenshot should still be
    traceable back to a server log line, independent of whether Sentry is
    configured."""
    from starlette.requests import Request

    import app.main

    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})

    response = await app.main.unhandled_exception_handler(request, RuntimeError("boom"))

    assert response.status_code == 500
    body = json.loads(response.body)
    assert body["detail"] == "Internal Server Error"
    assert len(body["request_id"]) == 32
