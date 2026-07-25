import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: uuid.UUID | None = None


class MessageRead(ORMModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class ConversationRead(ORMModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationRead):
    messages: list[MessageRead]
