import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.services import session_service

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if not credentials:
        raise UnauthorizedError()
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")

    try:
        user_id = uuid.UUID(payload.get("sub", ""))
        jti = uuid.UUID(payload.get("jti", ""))
    except ValueError:
        # A validly signed token missing/malforming sub or jti predates this
        # scheme or was tampered with either way; not usable.
        raise UnauthorizedError("Invalid token") from None

    # Checked before loading the user: a revoked or expired session should
    # never leak whether the user row itself exists.
    if not await session_service.is_valid(db, jti):
        raise UnauthorizedError("Session has been signed out")

    user = await db.get(User, user_id)
    if not user:
        raise UnauthorizedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_verified_email(user: CurrentUser) -> None:
    """Gates chat, uploads, and bookmarks behind a verified email, per
    FEATURES.md's original spec ("verify email before first AI action").
    Scoped to exactly these three routes as approved — POST /documents also
    triggers embedding when content is present but is deliberately left
    ungated, so plain note-taking never requires verification."""
    if not user.email_verified:
        raise ForbiddenError("Verify your email before using this feature")


async def get_current_session_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> uuid.UUID:
    """Only for the sign-out route — extracts the session id without the
    full validity check, since signing out an already-expired session should
    still succeed rather than 401."""
    if not credentials:
        raise UnauthorizedError()
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise UnauthorizedError("Invalid or expired token")
    try:
        return uuid.UUID(payload.get("jti", ""))
    except ValueError:
        raise UnauthorizedError("Invalid token") from None


CurrentSessionId = Annotated[uuid.UUID, Depends(get_current_session_id)]
RequireVerifiedEmail = Depends(require_verified_email)
