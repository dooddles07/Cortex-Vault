import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if not credentials:
        raise UnauthorizedError()
    subject = decode_access_token(credentials.credentials)
    if not subject:
        raise UnauthorizedError("Invalid or expired token")
    user = await db.get(User, uuid.UUID(subject))
    if not user:
        raise UnauthorizedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
