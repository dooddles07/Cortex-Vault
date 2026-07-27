import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def log(
    db: AsyncSession,
    action: str,
    user_id: uuid.UUID | None = None,
    meta: dict | None = None,
    ip: str | None = None,
) -> None:
    """Append-only audit trail. Commits on its own row so a caller mid
    transaction isn't forced to commit early just to log an action."""
    db.add(AuditLog(user_id=user_id, action=action, meta=meta, ip=ip))
    await db.commit()
