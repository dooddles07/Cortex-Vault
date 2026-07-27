import secrets
import uuid
from datetime import UTC, datetime

import pyotp
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.core.security import hash_token
from app.models import MfaBackupCode, User

BACKUP_CODE_COUNT = 10
_ISSUER = "CortexVault"


def _generate_backup_codes() -> list[str]:
    """8 hex characters each — short enough to type by hand, long enough
    that guessing one is not a realistic attack next to the account lockout
    already in place on sign-in."""
    return [secrets.token_hex(4) for _ in range(BACKUP_CODE_COUNT)]


async def start_enrollment(db: AsyncSession, user: User) -> tuple[str, str, list[str]]:
    """Generates a new TOTP secret and a fresh set of backup codes. Not yet
    active — `mfa_enabled` only flips true once confirm_enrollment verifies a
    real code from the authenticator app. Returns (secret, otpauth_uri,
    plaintext backup codes) — the plaintext codes are returned exactly once
    and never recoverable again."""
    if user.mfa_enabled:
        raise ConflictError("MFA is already enabled — disable it before re-enrolling")

    secret = pyotp.random_base32()
    user.mfa_secret = secret

    # Replace any codes from a previous, uncompleted enrollment attempt.
    await db.execute(delete(MfaBackupCode).where(MfaBackupCode.user_id == user.id))
    codes = _generate_backup_codes()
    db.add_all(MfaBackupCode(user_id=user.id, code_hash=hash_token(c)) for c in codes)
    await db.commit()

    otpauth_uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=_ISSUER)
    return secret, otpauth_uri, codes


async def confirm_enrollment(db: AsyncSession, user: User, code: str) -> bool:
    """Verifies a real code from the authenticator app before turning MFA on
    — proves the user actually has working access to the secret, not just
    that the server generated one."""
    if not user.mfa_secret:
        raise ConflictError("No MFA enrollment in progress")
    if not pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1):
        return False
    user.mfa_enabled = True
    await db.commit()
    return True


async def disable(db: AsyncSession, user: User, code: str) -> bool:
    """Requires a valid TOTP or backup code before turning MFA off — a bearer
    token alone proves nothing about possession of the second factor, so a
    stolen token must not be enough to strip MFA protection."""
    if not await verify_challenge(db, user, code):
        return False
    user.mfa_enabled = False
    user.mfa_secret = None
    await db.execute(delete(MfaBackupCode).where(MfaBackupCode.user_id == user.id))
    await db.commit()
    return True


async def verify_challenge(db: AsyncSession, user: User, code: str) -> bool:
    """A TOTP code, or a still-unused backup code, either one."""
    if user.mfa_secret and pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1):
        return True

    row = await db.scalar(
        select(MfaBackupCode).where(
            MfaBackupCode.user_id == user.id,
            MfaBackupCode.code_hash == hash_token(code),
            MfaBackupCode.used_at.is_(None),
        )
    )
    if not row:
        return False
    row.used_at = datetime.now(UTC)
    await db.commit()
    return True


async def get_user_for_challenge(db: AsyncSession, user_id: str) -> User | None:
    try:
        return await db.get(User, uuid.UUID(user_id))
    except ValueError:
        return None
