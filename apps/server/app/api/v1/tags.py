import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models import Tag
from app.schemas.tag import TagCreate, TagRead
from app.services import tag_service

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[TagRead])
async def list_tags(user: CurrentUser, db: DbSession) -> list[Tag]:
    return await tag_service.list_tags(db, user.id)


@router.post("/tags", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(payload: TagCreate, user: CurrentUser, db: DbSession) -> Tag:
    return await tag_service.create_tag(db, user.id, payload)


@router.post("/documents/{document_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def attach_tag(
    document_id: uuid.UUID, tag_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> None:
    from app.services import document_service

    await document_service.get_document(db, user.id, document_id)
    await tag_service.attach_tag(db, user.id, document_id, tag_id)


@router.delete("/documents/{document_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def detach_tag(
    document_id: uuid.UUID, tag_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> None:
    from app.services import document_service

    await document_service.get_document(db, user.id, document_id)
    await tag_service.detach_tag(db, user.id, document_id, tag_id)
