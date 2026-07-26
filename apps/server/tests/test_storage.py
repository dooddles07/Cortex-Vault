from app.core.config import settings
from app.storage import r2


async def test_unconfigured_storage_reports_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", None)
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", None)
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", None)
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", None)

    assert r2.is_configured() is False


async def test_store_original_returns_none_without_crashing_when_unconfigured(monkeypatch):
    """Storage must be optional: an unconfigured R2 cannot block or fail an upload."""
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", None)

    result = await r2.store_original("user-1", "doc-1", "a.txt", b"hello", "text/plain")

    assert result is None


async def test_store_original_swallows_upload_failures(monkeypatch):
    """A storage outage must not fail the upload request that triggered it."""
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "acct")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", "bucket")

    def _boom(key, data, content_type):
        raise RuntimeError("simulated R2 outage")

    monkeypatch.setattr(r2, "_put", _boom)

    result = await r2.store_original("user-1", "doc-1", "a.txt", b"hello", "text/plain")

    assert result is None


async def test_delete_original_is_a_noop_without_a_file_path(monkeypatch):
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "acct")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", "bucket")

    calls = []
    monkeypatch.setattr(r2, "_delete", lambda key: calls.append(key))

    await r2.delete_original(None)

    assert calls == []


async def test_delete_original_removes_the_stored_key(monkeypatch):
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "acct")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", "bucket")

    calls = []
    monkeypatch.setattr(r2, "_delete", lambda key: calls.append(key))

    await r2.delete_original("user-1/doc-1/a.txt")

    assert calls == ["user-1/doc-1/a.txt"]


async def test_delete_original_swallows_failures(monkeypatch):
    """A hard delete the user asked for must succeed even if R2 is unreachable."""
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "acct")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", "bucket")

    def _boom(key):
        raise RuntimeError("simulated R2 outage")

    monkeypatch.setattr(r2, "_delete", _boom)

    await r2.delete_original("user-1/doc-1/a.txt")  # must not raise
