from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.models import User
from app.schemas.user import UserRead, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserRead)
async def read_me(user: CurrentUser) -> User:
    return user


@router.patch("", response_model=UserRead)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> User:
    return await user_service.update_me(db, user, payload)
