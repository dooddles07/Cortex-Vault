import uuid

from pydantic import BaseModel


class UploadAccepted(BaseModel):
    document_id: uuid.UUID
    job_id: uuid.UUID
    ingest_status: str


class IngestStatus(BaseModel):
    document_id: uuid.UUID
    ingest_status: str
    job_status: str | None
    error: str | None
