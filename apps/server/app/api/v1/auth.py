from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.api.limits import AuthLimit
from app.schemas.auth import SignInRequest, SignUpRequest, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/sign-up",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[AuthLimit],
)
async def sign_up(payload: SignUpRequest, db: DbSession) -> TokenResponse:
    return await auth_service.sign_up(db, payload)


@router.post("/sign-in", response_model=TokenResponse, dependencies=[AuthLimit])
async def sign_in(payload: SignInRequest, db: DbSession) -> TokenResponse:
    return await auth_service.sign_in(db, payload)
