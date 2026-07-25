import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300), default="New conversation")
    summary: Mapped[str | None] = mapped_column(Text)


class Message(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)


class MessageCitation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "message_citations"

    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), index=True
    )
    chunk_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chunks.id", ondelete="CASCADE"))
    rank: Mapped[int] = mapped_column(Integer)
