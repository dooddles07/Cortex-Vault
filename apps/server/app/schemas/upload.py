import uuid

from pydantic import BaseModel


class UploadAccepted(BaseModel):
    document_id: uuid.UUID
    # Null when the file carries no indexable text, so no ingest job is queued.
    job_id: uuid.UUID | None
    ingest_status: str


class IngestStatus(BaseModel):
    document_id: uuid.UUID
    ingest_status: str
    job_status: str | None
    error: str | None
