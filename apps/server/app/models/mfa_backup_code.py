import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class MfaBackupCode(Base, UUIDMixin, TimestampMixin):
    """One-time-use recovery codes for when the authenticator app is
    unavailable. Only the SHA-256 hash is stored, same principle as a
    password or a verification token — the plaintext is shown once, at
    generation time, and never again."""

    __tablename__ = "mfa_backup_codes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    code_hash: Mapped[str] = mapped_column(String(64), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
