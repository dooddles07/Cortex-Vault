"""GET /me/export -- GDPR Article 20 data portability. No prior test covered
GET /me at all; this is the first, anchored to the export shape rather than
the trivial cases (which test_smoke.py's auth-rejection check already covers)."""

from tests.helpers import requires_db

pytestmark = requires_db


def test_export_requires_auth(client):
    response = client.get("/api/v1/me/export")
    assert response.status_code == 401


def test_export_is_empty_for_a_fresh_account(client, auth):
    response = client.get("/api/v1/me/export", headers=auth())
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["documents"] == []
    assert body["folders"] == []
    assert body["tags"] == []
    assert body["collections"] == []
    assert body["conversations"] == []
    assert body["user"]["email"].startswith("t-")
    assert "hashed_password" not in body["user"]
    assert "mfa_secret" not in body["user"]


def test_export_includes_owned_data_and_relationships(client, auth):
    headers = auth()

    folder_id = client.post(
        "/api/v1/folders", json={"name": "Reading"}, headers=headers
    ).json()["id"]
    doc = client.post(
        "/api/v1/documents",
        json={"title": "Doc", "type": "note", "content": "hello", "folder_id": folder_id},
        headers=headers,
    ).json()
    tag_id = client.post(
        "/api/v1/tags", json={"name": "reference"}, headers=headers
    ).json()["id"]
    client.post(f"/api/v1/documents/{doc['id']}/tags/{tag_id}", headers=headers)
    collection_id = client.post(
        "/api/v1/collections", json={"name": "Favorites"}, headers=headers
    ).json()["id"]
    client.post(
        f"/api/v1/collections/{collection_id}/documents/{doc['id']}", headers=headers
    )

    response = client.get("/api/v1/me/export", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()

    assert len(body["folders"]) == 1
    assert body["folders"][0]["name"] == "Reading"

    assert len(body["documents"]) == 1
    exported_doc = body["documents"][0]
    assert exported_doc["title"] == "Doc"
    assert exported_doc["content"] == "hello"
    assert exported_doc["folder_id"] == folder_id
    assert len(exported_doc["tag_ids"]) == 1

    assert len(body["collections"]) == 1
    assert body["collections"][0]["document_ids"] == [doc["id"]]


def test_export_does_not_leak_another_users_data(client, auth):
    other_headers = auth()
    client.post(
        "/api/v1/documents",
        json={"title": "Not yours", "type": "note"},
        headers=other_headers,
    )

    my_headers = auth()
    response = client.get("/api/v1/me/export", headers=my_headers)
    assert response.status_code == 200, response.text
    assert response.json()["documents"] == []
