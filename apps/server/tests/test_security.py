from app.core.security import (
    create_access_token,
    create_mfa_challenge_token,
    decode_access_token,
    decode_mfa_challenge_token,
    generate_token,
    hash_password,
    hash_token,
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
    payload = decode_access_token(create_access_token("user-123", "jti-456"))
    assert payload["sub"] == "user-123"
    assert payload["jti"] == "jti-456"


def test_tampered_token_rejected():
    assert decode_access_token(create_access_token("user-123", "jti-456") + "x") is None


def test_generated_tokens_are_unique():
    assert generate_token() != generate_token()


def test_hash_token_is_deterministic_and_one_way():
    token = generate_token()
    assert hash_token(token) == hash_token(token)
    assert hash_token(token) != token


def test_mfa_challenge_token_roundtrip():
    assert decode_mfa_challenge_token(create_mfa_challenge_token("user-123")) == "user-123"


def test_mfa_challenge_token_rejected_by_the_access_token_decoder():
    """A session-scoped route must never accept an MFA challenge token —
    it carries no `jti`, so get_current_user rejects it outright."""
    challenge = create_mfa_challenge_token("user-123")
    payload = decode_access_token(challenge)
    assert payload is not None  # signature is valid...
    assert "jti" not in payload  # ...but it has no session to check


def test_access_token_rejected_by_the_mfa_challenge_decoder():
    """The reverse must also hold: a real session token must not satisfy an
    MFA challenge — purpose is checked, not just the signature."""
    access = create_access_token("user-123", "jti-456")
    assert decode_mfa_challenge_token(access) is None
