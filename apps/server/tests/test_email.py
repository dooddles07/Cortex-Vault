import httpx

from app.core import email
from app.core.config import settings


async def test_unconfigured_email_is_a_noop(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", None)
    assert email.is_configured() is False
    await email.send_email("user@example.com", "Subject", "<p>body</p>")


async def test_send_failure_is_swallowed(monkeypatch):
    """A mail-provider outage must not fail the request that triggered it."""
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    async def _boom(self, *args, **kwargs):
        raise httpx.ConnectError("simulated outage", request=None)

    monkeypatch.setattr(httpx.AsyncClient, "post", _boom)

    await email.send_email("user@example.com", "Subject", "<p>body</p>")


async def test_configured_send_posts_to_resend(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(settings, "MAIL_FROM", "CortexVault <test@example.com>")

    captured = {}

    class _Resp:
        def raise_for_status(self):
            pass

    async def _post(self, url, headers=None, json=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return _Resp()

    monkeypatch.setattr(httpx.AsyncClient, "post", _post)

    await email.send_email("user@example.com", "Verify", "<p>link</p>")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["json"]["to"] == ["user@example.com"]
    assert captured["json"]["from"] == "CortexVault <test@example.com>"
    assert captured["json"]["subject"] == "Verify"
