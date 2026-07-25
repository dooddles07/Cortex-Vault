from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import SignInRequest, SignUpRequest, TokenResponse


async def sign_up(db: AsyncSession, payload: SignUpRequest) -> TokenResponse:
    exists = await db.scalar(select(User).where(User.email == payload.email))
    if exists:
        raise ConflictError("Email already registered")

    user = User(
        email=payload.email, hashed_password=hash_password(payload.password), name=payload.name
    )
    db.add(user)
    await db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))


async def sign_in(db: AsyncSession, payload: SignInRequest) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")
    return TokenResponse(access_token=create_access_token(str(user.id)))
