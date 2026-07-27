import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models import Collection, Document
from app.schemas.collection import CollectionCreate, CollectionRead
from app.schemas.document import DocumentRead
from app.services import collection_service

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionRead])
async def list_collections(user: CurrentUser, db: DbSession) -> list[Collection]:
    return await collection_service.list_collections(db, user.id)


@router.post("", response_model=CollectionRead, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate, user: CurrentUser, db: DbSession
) -> Collection:
    return await collection_service.create_collection(db, user.id, payload)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await collection_service.delete_collection(db, user.id, collection_id)


@router.get("/{collection_id}/documents", response_model=list[DocumentRead])
async def list_documents(
    collection_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> list[Document]:
    return await collection_service.list_documents(db, user.id, collection_id)


@router.post("/{collection_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_document(
    collection_id: uuid.UUID, document_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> None:
    await collection_service.add_document(db, user.id, collection_id, document_id)


@router.delete("/{collection_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document(
    collection_id: uuid.UUID, document_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> None:
    await collection_service.remove_document(db, user.id, collection_id, document_id)
