import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt hashes at most 72 bytes; longer input must be truncated by the caller.
_BCRYPT_MAX_BYTES = 72


def _encode(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_encode(plain), hashed.encode("utf-8"))


def create_access_token(subject: str, jti: str) -> str:
    """`jti` ties the token to a `sessions` row, so it can be revoked without
    rotating JWT_SECRET (which would invalidate every other user's tokens
    too)."""
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": subject, "jti": jti, "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    """Verifies the signature and expiry only. The caller is still
    responsible for checking the session (`jti`) hasn't been revoked."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


def new_jti() -> str:
    return str(uuid.uuid4())


def generate_token() -> str:
    """URL-safe random token for email verification / password reset links."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Only the hash is ever stored — same principle as a password, so a
    database read alone can't be replayed as the token itself."""
    return hashlib.sha256(token.encode()).hexdigest()
