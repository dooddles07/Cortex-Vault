import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Session

logger = logging.getLogger(__name__)

# Kept well past the token's own expiry so a session row is never removed
# while there's any realistic chance its JWT could still be presented.
_RETENTION_DAYS = 30


async def create_session(db: AsyncSession, user_id: uuid.UUID, jti: uuid.UUID) -> Session:
    session = Session(
        id=jti,
        user_id=user_id,
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    db.add(session)
    await db.commit()
    return session


async def is_valid(db: AsyncSession, jti: uuid.UUID) -> bool:
    """A session is valid if it exists, isn't revoked, and isn't past its own
    expiry — the last check is redundant with the JWT's own `exp` claim, but
    cheap insurance against the two ever drifting apart."""
    session = await db.get(Session, jti)
    if not session or session.revoked_at is not None:
        return False
    return session.expires_at > datetime.now(UTC)


async def revoke(db: AsyncSession, jti: uuid.UUID) -> None:
    session = await db.get(Session, jti)
    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        await db.commit()


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Used on password reset: a leaked-then-reset password shouldn't leave
    the attacker's existing sessions valid."""
    await db.execute(
        update(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await db.commit()


async def purge_old_sessions(db: AsyncSession) -> int:
    """Deletes session rows well past expiry, across all users. Same
    opportunistic-on-startup pattern as document_service.purge_expired_trash
    — there's no free-tier cron to run this on a real schedule."""
    cutoff = datetime.now(UTC) - timedelta(days=_RETENTION_DAYS)
    result = await db.execute(delete(Session).where(Session.expires_at < cutoff))
    await db.commit()
    if result.rowcount:
        logger.info("purged %d expired session(s)", result.rowcount)
    return result.rowcount
