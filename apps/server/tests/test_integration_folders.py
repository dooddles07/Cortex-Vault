"""Folder assignment against a real database: ownership on create and update."""

from tests.helpers import requires_db

pytestmark = requires_db


def _create_folder(client, headers, name="Research"):
    response = client.post("/api/v1/folders", json={"name": name}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_create_document_in_own_folder(client, auth):
    headers = auth()
    folder_id = _create_folder(client, headers)

    response = client.post(
        "/api/v1/documents",
        json={"title": "Doc", "type": "note", "folder_id": folder_id},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["folder_id"] == folder_id


def test_cannot_create_document_in_another_users_folder(client, auth):
    owner_headers = auth()
    folder_id = _create_folder(client, owner_headers)

    attacker_headers = auth()
    response = client.post(
        "/api/v1/documents",
        json={"title": "Doc", "type": "note", "folder_id": folder_id},
        headers=attacker_headers,
    )
    assert response.status_code == 404


def test_cannot_move_document_into_another_users_folder(client, auth):
    owner_headers = auth()
    folder_id = _create_folder(client, owner_headers)

    attacker_headers = auth()
    doc = client.post(
        "/api/v1/documents", json={"title": "Doc", "type": "note"}, headers=attacker_headers
    ).json()

    response = client.patch(
        f"/api/v1/documents/{doc['id']}",
        json={"folder_id": folder_id},
        headers=attacker_headers,
    )
    assert response.status_code == 404
