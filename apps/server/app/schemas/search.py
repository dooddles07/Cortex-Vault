import uuid

from pydantic import BaseModel


class SearchHit(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    content: str
    score: float


class SearchResponse(BaseModel):
    query: str
    mode: str
    hits: list[SearchHit]
