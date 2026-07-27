"""Transactional email via Resend's HTTP API.

Optional, same graceful-degradation pattern as REDIS_URL and R2_*: without
RESEND_API_KEY set, send_email logs and returns rather than raising, so
sign-up/forgot-password still succeed — the user just never receives a link.
Without a verified custom domain, Resend's free tier only delivers to the
account owner's own verified address (sandbox mode) — fine for solo use,
revisit before other real users sign up.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 10.0


def is_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


async def send_email(to: str, subject: str, html: str) -> None:
    if not is_configured():
        logger.warning("RESEND_API_KEY unset — skipping email to %s: %s", to, subject)
        return
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.MAIL_FROM, "to": [to], "subject": subject, "html": html},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        # A mail-provider outage must not fail the request that triggered it
        # (sign-up, forgot-password) — the user can always ask for another link.
        logger.exception("failed to send email to %s", to)
