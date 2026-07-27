"""Session row purge against a real database — the companion to trash purge,
run on the same opportunistic API-startup pass (see app/main.py)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import Session, User
from app.services.session_service import purge_old_sessions
from tests.helpers import requires_db

pytestmark = requires_db


async def _make_user(db_session, email):
    user = User(email=email, hashed_password="x")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_purge_removes_sessions_past_the_retention_window(db_session):
    user = await _make_user(db_session, "old-session@cortexvault-test.com")
    old = Session(
        user_id=user.id,
        expires_at=datetime.now(UTC) - timedelta(days=40),
    )
    db_session.add(old)
    await db_session.commit()

    purged = await purge_old_sessions(db_session)

    assert purged == 1
    assert await db_session.get(Session, old.id) is None


async def test_purge_leaves_recently_expired_sessions(db_session):
    user = await _make_user(db_session, "recent-session@cortexvault-test.com")
    recent = Session(
        user_id=user.id,
        expires_at=datetime.now(UTC) - timedelta(minutes=5),
    )
    db_session.add(recent)
    await db_session.commit()

    purged = await purge_old_sessions(db_session)

    assert purged == 0
    assert await db_session.get(Session, recent.id) is not None


async def test_purge_leaves_active_sessions(db_session):
    user = await _make_user(db_session, "active-session@cortexvault-test.com")
    active = Session(
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(active)
    await db_session.commit()

    purged = await purge_old_sessions(db_session)

    assert purged == 0
    assert await db_session.get(Session, active.id) is not None


async def test_no_sessions_returns_zero(db_session):
    assert await purge_old_sessions(db_session) == 0
    # sanity: table really is queryable and empty for this fresh test
    assert (await db_session.scalars(select(Session))).all() == []
