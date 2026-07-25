import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base, TimestampMixin, UUIDMixin


class Document(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("folders.id", ondelete="SET NULL"), index=True
    )
    type: Mapped[str] = mapped_column(String(20), default="note")
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    ingest_status: Mapped[str] = mapped_column(String(30), default="pending")
    starred: Mapped[bool] = mapped_column(default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class DocumentTag(Base):
    __tablename__ = "document_tags"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )


class Chunk(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.EMBEDDING_DIM))
