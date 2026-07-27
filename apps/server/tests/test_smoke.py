"""Import-time and startup checks. These catch the class of bug that only
appears on deploy: eager client construction, bad imports, missing config."""


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


async def test_startup_trash_purge_never_crashes_boot(monkeypatch):
    """No scheduler exists on the free tier, so the trash purge runs
    opportunistically on API startup (see app/main.py) — it must never take
    the app down, including when the database itself is unreachable."""
    import app.main

    async def _boom(_db):
        raise RuntimeError("simulated database outage")

    monkeypatch.setattr("app.services.document_service.purge_expired_trash", _boom)

    await app.main._purge_trash_on_startup()
