from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.deps import CurrentSessionId, CurrentUser, DbSession
from app.api.limits import AuthLimit
from app.core.config import settings
from app.core.email import send_email
from app.core.rate_limit import client_ip
from app.models.verification_token import PURPOSE_RESET_PASSWORD, PURPOSE_VERIFY_EMAIL
from app.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    MfaChallengeRequest,
    MfaCodeRequest,
    MfaEnrollResponse,
    ResetPasswordRequest,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.services import auth_service, mfa_service

router = APIRouter(prefix="/auth", tags=["auth"])

# Generic wording on purpose — never confirms whether an email is registered.
_RESET_SENT_MESSAGE = "If that email is registered, a password reset link has been sent."


@router.post(
    "/sign-up",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[AuthLimit],
)
async def sign_up(
    payload: SignUpRequest, db: DbSession, background: BackgroundTasks, request: Request
) -> TokenResponse:
    token, user = await auth_service.sign_up(db, payload, ip=client_ip(request))

    verify_token = await auth_service.create_verification_token(
        db, user, PURPOSE_VERIFY_EMAIL, timedelta(hours=settings.EMAIL_VERIFICATION_TTL_HOURS)
    )
    link = f"{settings.WEB_BASE_URL}/verify-email?token={verify_token}"
    background.add_task(
        send_email,
        user.email,
        "Verify your CortexVault email",
        f"<p>Confirm your email to finish setting up CortexVault.</p>"
        f'<p><a href="{link}">Verify email</a></p>'
        f"<p>This link expires in {settings.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>",
    )
    return token


@router.post("/sign-in", response_model=SignInResponse, dependencies=[AuthLimit])
async def sign_in(payload: SignInRequest, db: DbSession, request: Request) -> SignInResponse:
    return await auth_service.sign_in(db, payload, ip=client_ip(request))


@router.post("/mfa/challenge", response_model=TokenResponse, dependencies=[AuthLimit])
async def mfa_challenge(
    payload: MfaChallengeRequest, db: DbSession, request: Request
) -> TokenResponse:
    return await auth_service.complete_mfa_challenge(
        db, payload.mfa_token, payload.code, ip=client_ip(request)
    )


@router.post("/sign-out", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(db: DbSession, session_id: CurrentSessionId) -> None:
    await auth_service.sign_out(db, session_id)


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(payload: VerifyEmailRequest, db: DbSession) -> None:
    await auth_service.verify_email(db, payload.token)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    dependencies=[AuthLimit],
)
async def forgot_password(
    payload: ForgotPasswordRequest, db: DbSession, background: BackgroundTasks
) -> MessageResponse:
    user = await auth_service.find_user_for_password_reset(db, payload.email)
    if user:
        token = await auth_service.create_verification_token(
            db, user, PURPOSE_RESET_PASSWORD, timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES)
        )
        link = f"{settings.WEB_BASE_URL}/reset-password?token={token}"
        background.add_task(
            send_email,
            user.email,
            "Reset your CortexVault password",
            f"<p>Someone requested a password reset for this account.</p>"
            f'<p><a href="{link}">Reset password</a></p>'
            f"<p>This link expires in {settings.PASSWORD_RESET_TTL_MINUTES} minutes. "
            "If this wasn't you, ignore this email.</p>",
        )
    return MessageResponse(message=_RESET_SENT_MESSAGE)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT, dependencies=[AuthLimit])
async def reset_password(payload: ResetPasswordRequest, db: DbSession) -> None:
    await auth_service.reset_password(db, payload.token, payload.new_password)


@router.post("/mfa/enable", response_model=MfaEnrollResponse)
async def enable_mfa(user: CurrentUser, db: DbSession) -> MfaEnrollResponse:
    """Starts enrollment: generates a secret and backup codes. MFA is not yet
    required at sign-in until POST /mfa/verify confirms a real code."""
    secret, otpauth_uri, backup_codes = await mfa_service.start_enrollment(db, user)
    return MfaEnrollResponse(secret=secret, otpauth_uri=otpauth_uri, backup_codes=backup_codes)


@router.post("/mfa/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_mfa(payload: MfaCodeRequest, user: CurrentUser, db: DbSession) -> None:
    if not await mfa_service.confirm_enrollment(db, user, payload.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code")


@router.post("/mfa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def disable_mfa(user: CurrentUser, db: DbSession) -> None:
    await mfa_service.disable(db, user)
