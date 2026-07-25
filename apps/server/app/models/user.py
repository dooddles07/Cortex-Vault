from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str | None] = mapped_column(String(120))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    theme_preference: Mapped[str] = mapped_column(String(10), default="system")
