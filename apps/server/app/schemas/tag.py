import uuid

from pydantic import Field

from app.schemas.common import ORMModel


class TagCreate(ORMModel):
    name: str = Field(max_length=80)


class TagRead(ORMModel):
    id: uuid.UUID
    name: str
