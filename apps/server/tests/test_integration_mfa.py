"""MFA (TOTP + backup codes) against a real database."""

import pyotp

from tests.helpers import requires_db

pytestmark = requires_db


def _enable(client, headers):
    enroll = client.post("/api/v1/auth/mfa/enable", headers=headers).json()
    code = pyotp.TOTP(enroll["secret"]).now()
    confirm = client.post("/api/v1/auth/mfa/verify", json={"code": code}, headers=headers)
    assert confirm.status_code == 204, confirm.text
    return enroll


def test_enroll_then_confirm_enables_mfa(client, auth):
    headers = auth()
    enroll = _enable(client, headers)

    assert enroll["secret"]
    assert enroll["otpauth_uri"].startswith("otpauth://totp/")
    assert len(enroll["backup_codes"]) == 10


def test_confirm_with_wrong_code_does_not_enable_mfa(client, auth):
    headers = auth()
    client.post("/api/v1/auth/mfa/enable", headers=headers)

    response = client.post("/api/v1/auth/mfa/verify", json={"code": "000000"}, headers=headers)
    assert response.status_code == 400


def test_full_sign_in_challenge_flow(client):
    email = "mfa-flow@cortexvault-test.com"
    password = "TestPassw0rd!123"
    signup = client.post(
        "/api/v1/auth/sign-up", json={"email": email, "password": password}
    ).json()
    headers = {"Authorization": f"Bearer {signup['access_token']}"}
    enroll = _enable(client, headers)

    sign_in = client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": password}
    ).json()
    assert sign_in["mfa_required"] is True
    assert sign_in["access_token"] is None
    assert sign_in["mfa_token"]

    code = pyotp.TOTP(enroll["secret"]).now()
    challenge = client.post(
        "/api/v1/auth/mfa/challenge", json={"mfa_token": sign_in["mfa_token"], "code": code}
    )
    assert challenge.status_code == 200
    assert challenge.json()["access_token"]


def test_challenge_rejects_wrong_code(client):
    email = "mfa-wrong-code@cortexvault-test.com"
    password = "TestPassw0rd!123"
    signup = client.post(
        "/api/v1/auth/sign-up", json={"email": email, "password": password}
    ).json()
    headers = {"Authorization": f"Bearer {signup['access_token']}"}
    _enable(client, headers)

    sign_in = client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": password}
    ).json()

    challenge = client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": sign_in["mfa_token"], "code": "000000"},
    )
    assert challenge.status_code == 401


def test_backup_code_completes_the_challenge_once_then_is_spent(client):
    email = "mfa-backup-code@cortexvault-test.com"
    password = "TestPassw0rd!123"
    signup = client.post(
        "/api/v1/auth/sign-up", json={"email": email, "password": password}
    ).json()
    headers = {"Authorization": f"Bearer {signup['access_token']}"}
    enroll = _enable(client, headers)
    backup_code = enroll["backup_codes"][0]

    sign_in = client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": password}
    ).json()
    first = client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": sign_in["mfa_token"], "code": backup_code},
    )
    assert first.status_code == 200

    # Same backup code, a second time: must not still work.
    sign_in_again = client.post(
        "/api/v1/auth/sign-in", json={"email": email, "password": password}
    ).json()
    second = client.post(
        "/api/v1/auth/mfa/challenge",
        json={"mfa_token": sign_in_again["mfa_token"], "code": backup_code},
    )
    assert second.status_code == 401


def test_disable_mfa_requires_a_valid_code(client, auth):
    headers = auth()
    _enable(client, headers)

    response = client.post(
        "/api/v1/auth/mfa/disable", json={"code": "000000"}, headers=headers
    )
    assert response.status_code == 400


def test_disable_mfa_allows_re_enrollment(client, auth):
    headers = auth()
    enroll = _enable(client, headers)

    code = pyotp.TOTP(enroll["secret"]).now()
    response = client.post(
        "/api/v1/auth/mfa/disable", json={"code": code}, headers=headers
    )
    assert response.status_code == 204

    # Re-enrolling should work again now that it's fully disabled — proves
    # disable actually cleared mfa_enabled, not just the secret.
    second_enroll = client.post("/api/v1/auth/mfa/enable", headers=headers)
    assert second_enroll.status_code == 200


def test_cannot_enroll_twice_without_disabling(client, auth):
    headers = auth()
    _enable(client, headers)

    response = client.post("/api/v1/auth/mfa/enable", headers=headers)
    assert response.status_code == 409
