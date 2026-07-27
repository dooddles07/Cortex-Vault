import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import ORMModel


class CollectionCreate(ORMModel):
    name: str = Field(max_length=200)


class CollectionRead(ORMModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime
