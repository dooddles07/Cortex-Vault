import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Collection, CollectionItem, Document
from app.schemas.collection import CollectionCreate


async def list_collections(db: AsyncSession, user_id: uuid.UUID) -> list[Collection]:
    stmt = select(Collection).where(Collection.user_id == user_id).order_by(Collection.name)
    return list((await db.scalars(stmt)).all())


async def create_collection(
    db: AsyncSession, user_id: uuid.UUID, payload: CollectionCreate
) -> Collection:
    collection = Collection(user_id=user_id, name=payload.name)
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return collection


async def get_collection(
    db: AsyncSession, user_id: uuid.UUID, collection_id: uuid.UUID
) -> Collection:
    collection = await db.scalar(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == user_id)
    )
    if not collection:
        raise NotFoundError("Collection")
    return collection


async def delete_collection(db: AsyncSession, user_id: uuid.UUID, collection_id: uuid.UUID) -> None:
    collection = await get_collection(db, user_id, collection_id)
    await db.delete(collection)
    await db.commit()


async def add_document(
    db: AsyncSession, user_id: uuid.UUID, collection_id: uuid.UUID, document_id: uuid.UUID
) -> None:
    # Ownership check on both sides — a collection or document belonging to
    # another user must not be linkable even if the IDs are guessed.
    await get_collection(db, user_id, collection_id)
    doc = await db.scalar(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    if not doc:
        raise NotFoundError("Document")

    exists = await db.scalar(
        select(CollectionItem).where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.document_id == document_id,
        )
    )
    if exists:
        return
    db.add(CollectionItem(collection_id=collection_id, document_id=document_id))
    await db.commit()


async def remove_document(
    db: AsyncSession, user_id: uuid.UUID, collection_id: uuid.UUID, document_id: uuid.UUID
) -> None:
    await get_collection(db, user_id, collection_id)
    await db.execute(
        delete(CollectionItem).where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.document_id == document_id,
        )
    )
    await db.commit()


async def list_documents(
    db: AsyncSession, user_id: uuid.UUID, collection_id: uuid.UUID
) -> list[Document]:
    await get_collection(db, user_id, collection_id)
    stmt = (
        select(Document)
        .join(CollectionItem, CollectionItem.document_id == Document.id)
        .where(
            CollectionItem.collection_id == collection_id,
            Document.deleted_at.is_(None),
        )
        .order_by(Document.updated_at.desc())
    )
    return list((await db.scalars(stmt)).all())
