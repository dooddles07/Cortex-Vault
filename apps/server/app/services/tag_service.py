import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

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


async def attach_tag(db: AsyncSession, document_id: uuid.UUID, tag_id: uuid.UUID) -> None:
    exists = await db.scalar(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id
        )
    )
    if exists:
        return
    db.add(DocumentTag(document_id=document_id, tag_id=tag_id))
    await db.commit()


async def detach_tag(db: AsyncSession, document_id: uuid.UUID, tag_id: uuid.UUID) -> None:
    await db.execute(
        delete(DocumentTag).where(
            DocumentTag.document_id == document_id, DocumentTag.tag_id == tag_id
        )
    )
    await db.commit()
