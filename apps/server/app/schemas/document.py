import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel

# "file" covers uploads stored without text extraction (see uploads router).
DOC_TYPES = (
    "^(note|pdf|docx|pptx|xlsx|image|file|bookmark|clip|youtube|snippet|meeting|voice|email)$"
)


class DocumentCreate(ORMModel):
    title: str = Field(max_length=500)
    type: str = Field(default="note", pattern=DOC_TYPES)
    content: str | None = None
    source_url: str | None = None
    folder_id: uuid.UUID | None = None


class DocumentUpdate(ORMModel):
    title: str | None = Field(default=None, max_length=500)
    content: str | None = None
    folder_id: uuid.UUID | None = None
    starred: bool | None = None


class DocumentRead(ORMModel):
    id: uuid.UUID
    type: str
    title: str
    content: str | None
    summary: str | None
    source_url: str | None
    folder_id: uuid.UUID | None
    ingest_status: str
    starred: bool
    created_at: datetime
    updated_at: datetime
