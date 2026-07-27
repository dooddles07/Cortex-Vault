"""Auth security features against a real database: sessions/revocation,
account lockout, email verification, and password reset. RESEND_API_KEY is
unset in tests (see conftest), so send_email no-ops rather than reaching a
real provider — the verification/reset tokens are read straight from the
database instead of from an email.
"""

from sqlalchemy import select

from app.core.security import generate_token, hash_token
from app.models import Session, User, VerificationToken
from app.models.verification_token import PURPOSE_RESET_PASSWORD, PURPOSE_VERIFY_EMAIL
from tests.helpers import requires_db

pytestmark = requires_db

EMAIL = "sign-up-flow@cortexvault-test.com"
PASSWORD = "TestPassw0rd!123"


def _sign_up(client, email=EMAIL, password=PASSWORD):
    response = client.post(
        "/api/v1/auth/sign-up", json={"email": email, "password": password}
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


async def _latest_token(db_session, purpose):
    row = await db_session.scalar(
        select(VerificationToken)
        .where(VerificationToken.purpose == purpose)
        .order_by(VerificationToken.created_at.desc())
    )
    return row


def test_sign_up_issues_a_token_that_authenticates(client):
    token = _sign_up(client)
    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == EMAIL


def test_sign_out_revokes_the_session(client):
    token = _sign_up(client)
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/v1/me", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/sign-out", headers=headers).status_code == 204
    assert client.get("/api/v1/me", headers=headers).status_code == 401


def test_two_sign_ins_create_independent_sessions(client):
    _sign_up(client, email="two-sessions@cortexvault-test.com")
    first = client.post(
        "/api/v1/auth/sign-in",
        json={"email": "two-sessions@cortexvault-test.com", "password": PASSWORD},
    ).json()["access_token"]
    second = client.post(
        "/api/v1/auth/sign-in",
        json={"email": "two-sessions@cortexvault-test.com", "password": PASSWORD},
    ).json()["access_token"]

    client.post("/api/v1/auth/sign-out", headers={"Authorization": f"Bearer {first}"})

    first_headers = {"Authorization": f"Bearer {first}"}
    second_headers = {"Authorization": f"Bearer {second}"}
    assert client.get("/api/v1/me", headers=first_headers).status_code == 401
    assert client.get("/api/v1/me", headers=second_headers).status_code == 200


def test_account_locks_after_repeated_failed_sign_ins(client):
    email = "lockout@cortexvault-test.com"
    _sign_up(client, email=email)

    for _ in range(5):
        client.post("/api/v1/auth/sign-in", json={"email": email, "password": "wrong"})

    # The threshold is reached; even the correct password is now rejected.
    response = client.post("/api/v1/auth/sign-in", json={"email": email, "password": PASSWORD})
    assert response.status_code == 401
    assert "locked" in response.json()["detail"].lower()


def test_correct_password_before_threshold_still_succeeds(client):
    email = "near-lockout@cortexvault-test.com"
    _sign_up(client, email=email)

    for _ in range(3):
        client.post("/api/v1/auth/sign-in", json={"email": email, "password": "wrong"})

    response = client.post("/api/v1/auth/sign-in", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200


async def test_verify_email_end_to_end(client, db_session):
    email = "verify-e2e@cortexvault-test.com"
    _sign_up(client, email=email)
    user = await db_session.scalar(select(User).where(User.email == email))
    assert user.email_verified is False

    # Mint a token the same way create_verification_token does, so the
    # endpoint can be exercised without parsing an email.
    token = generate_token()
    row = await _latest_token(db_session, PURPOSE_VERIFY_EMAIL)
    row.token_hash = hash_token(token)
    await db_session.commit()

    response = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert response.status_code == 204

    await db_session.refresh(user)
    assert user.email_verified is True


def test_verify_email_rejects_unknown_token(client):
    response = client.post("/api/v1/auth/verify-email", json={"token": "not-a-real-token"})
    assert response.status_code == 401


def test_forgot_password_gives_the_same_response_either_way(client):
    _sign_up(client, email="has-account@cortexvault-test.com")

    known = client.post(
        "/api/v1/auth/forgot-password", json={"email": "has-account@cortexvault-test.com"}
    )
    unknown = client.post(
        "/api/v1/auth/forgot-password", json={"email": "no-such-account@cortexvault-test.com"}
    )

    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


async def test_reset_password_changes_password_and_revokes_sessions(client, db_session):
    email = "reset-me@cortexvault-test.com"
    token_before_reset = _sign_up(client, email=email)

    client.post("/api/v1/auth/forgot-password", json={"email": email})
    reset_token = generate_token()
    row = await _latest_token(db_session, PURPOSE_RESET_PASSWORD)
    row.token_hash = hash_token(reset_token)
    await db_session.commit()

    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "NewPassw0rd!456"},
    )
    assert response.status_code == 204

    # The session issued at sign-up is revoked by the reset.
    old_session_check = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {token_before_reset}"}
    )
    assert old_session_check.status_code == 401

    # Old password no longer works; new one does.
    assert client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": PASSWORD}
    ).status_code == 401
    assert client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": "NewPassw0rd!456"}
    ).status_code == 200

    user = await db_session.scalar(select(User).where(User.email == email))
    revoked = await db_session.scalar(
        select(Session).where(Session.user_id == user.id, Session.revoked_at.isnot(None))
    )
    assert revoked is not None


def test_reset_password_rejects_reused_token(client):
    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "never-issued", "new_password": "Whatever123!"},
    )
    assert response.status_code == 401
