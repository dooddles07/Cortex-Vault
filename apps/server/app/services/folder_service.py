import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Folder
from app.schemas.folder import FolderCreate, FolderUpdate


async def list_folders(db: AsyncSession, user_id: uuid.UUID) -> list[Folder]:
    stmt = select(Folder).where(Folder.user_id == user_id).order_by(Folder.name)
    return list((await db.scalars(stmt)).all())


async def create_folder(db: AsyncSession, user_id: uuid.UUID, payload: FolderCreate) -> Folder:
    folder = Folder(user_id=user_id, **payload.model_dump())
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


async def get_folder(db: AsyncSession, user_id: uuid.UUID, folder_id: uuid.UUID) -> Folder:
    folder = await db.scalar(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
    )
    if not folder:
        raise NotFoundError("Folder")
    return folder


async def update_folder(
    db: AsyncSession, user_id: uuid.UUID, folder_id: uuid.UUID, payload: FolderUpdate
) -> Folder:
    folder = await get_folder(db, user_id, folder_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(folder, field, value)
    await db.commit()
    await db.refresh(folder)
    return folder


async def delete_folder(db: AsyncSession, user_id: uuid.UUID, folder_id: uuid.UUID) -> None:
    folder = await get_folder(db, user_id, folder_id)
    await db.delete(folder)
    await db.commit()
