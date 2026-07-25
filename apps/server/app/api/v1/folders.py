import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models import Folder
from app.schemas.folder import FolderCreate, FolderRead, FolderUpdate
from app.services import folder_service

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderRead])
async def list_folders(user: CurrentUser, db: DbSession) -> list[Folder]:
    return await folder_service.list_folders(db, user.id)


@router.post("", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
async def create_folder(payload: FolderCreate, user: CurrentUser, db: DbSession) -> Folder:
    return await folder_service.create_folder(db, user.id, payload)


@router.patch("/{folder_id}", response_model=FolderRead)
async def update_folder(
    folder_id: uuid.UUID, payload: FolderUpdate, user: CurrentUser, db: DbSession
) -> Folder:
    return await folder_service.update_folder(db, user.id, folder_id, payload)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await folder_service.delete_folder(db, user.id, folder_id)
