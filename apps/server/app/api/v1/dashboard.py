from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(user: CurrentUser, db: DbSession) -> dict[str, object]:
    return await dashboard_service.summary(db, user.id)
