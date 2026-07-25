import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import ORMModel


class UserRead(ORMModel):
    id: uuid.UUID
    email: EmailStr
    name: str | None
    email_verified: bool
    theme_preference: str
    created_at: datetime


class UserUpdate(ORMModel):
    name: str | None = Field(default=None, max_length=120)
    theme_preference: str | None = Field(default=None, pattern="^(system|light|dark)$")
