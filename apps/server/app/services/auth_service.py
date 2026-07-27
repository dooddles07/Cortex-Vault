import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import User, VerificationToken
from app.models.verification_token import PURPOSE_RESET_PASSWORD, PURPOSE_VERIFY_EMAIL
from app.schemas.auth import SignInRequest, SignUpRequest, TokenResponse
from app.services import audit_service, session_service


async def _issue_token(db: AsyncSession, user: User) -> TokenResponse:
    jti = uuid.uuid4()
    await session_service.create_session(db, user.id, jti)
    return TokenResponse(access_token=create_access_token(str(user.id), str(jti)))


async def sign_up(
    db: AsyncSession, payload: SignUpRequest, ip: str | None = None
) -> tuple[TokenResponse, User]:
    exists = await db.scalar(select(User).where(User.email == payload.email))
    if exists:
        raise ConflictError("Email already registered")

    user = User(
        email=payload.email, hashed_password=hash_password(payload.password), name=payload.name
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await audit_service.log(db, "sign_up", user_id=user.id, ip=ip)
    token = await _issue_token(db, user)
    return token, user


async def sign_in(
    db: AsyncSession, payload: SignInRequest, ip: str | None = None
) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email))

    if user and user.locked_until and user.locked_until > datetime.now(UTC):
        await audit_service.log(db, "sign_in_blocked_locked", user_id=user.id, ip=ip)
        raise UnauthorizedError("Account temporarily locked after too many failed attempts")

    if not user or not verify_password(payload.password, user.hashed_password):
        if user:
            await _register_failed_attempt(db, user)
        await audit_service.log(db, "sign_in_failed", user_id=user.id if user else None, ip=ip)
        raise UnauthorizedError("Invalid email or password")

    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

    await audit_service.log(db, "sign_in", user_id=user.id, ip=ip)
    return await _issue_token(db, user)


async def _register_failed_attempt(db: AsyncSession, user: User) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= settings.ACCOUNT_LOCKOUT_THRESHOLD:
        user.locked_until = datetime.now(UTC) + timedelta(
            minutes=settings.ACCOUNT_LOCKOUT_MINUTES
        )
    await db.commit()


async def sign_out(db: AsyncSession, session_id: uuid.UUID) -> None:
    await session_service.revoke(db, session_id)


async def create_verification_token(
    db: AsyncSession, user: User, purpose: str, ttl: timedelta
) -> str:
    token = generate_token()
    db.add(
        VerificationToken(
            user_id=user.id,
            token_hash=hash_token(token),
            purpose=purpose,
            expires_at=datetime.now(UTC) + ttl,
        )
    )
    await db.commit()
    return token


async def find_user_for_password_reset(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email))


async def verify_email(db: AsyncSession, token: str) -> None:
    row = await _consume_token(db, token, PURPOSE_VERIFY_EMAIL)
    user = await db.get(User, row.user_id)
    if user:
        user.email_verified = True
        await db.commit()


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    row = await _consume_token(db, token, PURPOSE_RESET_PASSWORD)
    user = await db.get(User, row.user_id)
    if not user:
        return
    user.hashed_password = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()
    # A leaked-then-reset password shouldn't leave the attacker's existing
    # sessions valid.
    await session_service.revoke_all_for_user(db, user.id)
    await audit_service.log(db, "password_reset", user_id=user.id)


async def _consume_token(db: AsyncSession, token: str, purpose: str) -> VerificationToken:
    row = await db.scalar(
        select(VerificationToken).where(
            VerificationToken.token_hash == hash_token(token),
            VerificationToken.purpose == purpose,
        )
    )
    if not row or row.used_at is not None or row.expires_at < datetime.now(UTC):
        raise UnauthorizedError("Invalid or expired token")
    row.used_at = datetime.now(UTC)
    await db.commit()
    return row
