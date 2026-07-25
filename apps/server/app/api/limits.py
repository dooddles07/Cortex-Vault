"""Per-route rate limit dependencies.

Unauthenticated routes key on IP; authenticated routes key on user id, so one
user cannot exhaust another's budget by sharing an egress IP.
"""

from fastapi import Depends, Request

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.rate_limit import Limit, client_ip, enforce


async def limit_auth(request: Request) -> None:
    """Brute-force protection on sign-in and sign-up."""
    await enforce(
        "auth",
        client_ip(request),
        Limit(settings.RATE_LIMIT_AUTH, 60, "authentication"),
    )


async def limit_chat(user: CurrentUser) -> None:
    """Chat is the most expensive endpoint: it embeds, retrieves and calls an LLM."""
    await enforce(
        "chat",
        str(user.id),
        Limit(settings.RATE_LIMIT_CHAT, 60, "chat"),
    )


async def limit_upload(user: CurrentUser) -> None:
    await enforce(
        "upload",
        str(user.id),
        Limit(settings.RATE_LIMIT_UPLOAD, 60, "upload"),
    )


async def limit_search(user: CurrentUser) -> None:
    """Search embeds the query, so it carries provider cost too."""
    await enforce(
        "search",
        str(user.id),
        Limit(settings.RATE_LIMIT_SEARCH, 60, "search"),
    )


AuthLimit = Depends(limit_auth)
ChatLimit = Depends(limit_chat)
UploadLimit = Depends(limit_upload)
SearchLimit = Depends(limit_search)
