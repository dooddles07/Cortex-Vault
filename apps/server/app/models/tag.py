import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Tag(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tag_user_name"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80))
