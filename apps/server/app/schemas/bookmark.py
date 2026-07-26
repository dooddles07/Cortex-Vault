import uuid

from pydantic import BaseModel, Field


class BookmarkCreate(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    folder_id: uuid.UUID | None = None
