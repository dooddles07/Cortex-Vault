import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel


class FolderCreate(ORMModel):
    name: str = Field(max_length=200)
    parent_id: uuid.UUID | None = None


class FolderUpdate(ORMModel):
    name: str | None = Field(default=None, max_length=200)
    parent_id: uuid.UUID | None = None


class FolderRead(ORMModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    created_at: datetime
