from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_password_over_bcrypt_limit_does_not_raise():
    # bcrypt rejects >72 bytes; the caller must truncate.
    long_password = "a" * 200
    assert verify_password(long_password, hash_password(long_password))


def test_token_roundtrip():
    assert decode_access_token(create_access_token("user-123")) == "user-123"


def test_tampered_token_rejected():
    assert decode_access_token(create_access_token("user-123") + "x") is None
