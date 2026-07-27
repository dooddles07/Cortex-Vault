import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import DocumentTag, Tag
from app.schemas.tag import TagCreate


async def list_tags(db: AsyncSession, user_id: uuid.UUID) -> list[Tag]:
    stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
    return list((await db.scalars(stmt)).all())


async def create_tag(db: AsyncSession, user_id: uuid.UUID, payload: TagCreate) -> Tag:
    existing = await db.scalar(
        select(Tag).where(Tag.user_id == user_id, Tag.name == payload.name)
    )
    if existing:
        return existing
    tag = Tag(user_id=user_id, name=payload.name)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


async def _get_tag(db: AsyncSession, user_id: uuid.UUID, tag_id: uuid.UUID) -> Tag:
    tag = await db.scalar(select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id))
    if not tag:
        raise NotFoundError("Tag")
    return tag


async def attach_tag(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID, tag_id: uuid.UUID
) -> None:
    # Ownership check on both sides — a tag belonging to another user must
    # not be attachable even if the ID is guessed.
    await _get_tag(db, user_id, tag_id)

    exists = await db.scalar(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id
        )
    )
    if exists:
        return
    db.add(DocumentTag(document_id=document_id, tag_id=tag_id))
    await db.commit()


async def detach_tag(
    db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID, tag_id: uuid.UUID
) -> None:
    await _get_tag(db, user_id, tag_id)
    await db.execute(
        delete(DocumentTag).where(
            DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id
        )
    )
    await db.commit()
