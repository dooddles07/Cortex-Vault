"""Collections against a real database: CRUD plus document membership."""

from tests.helpers import requires_db

pytestmark = requires_db


def _create_doc(client, headers, title="Doc"):
    response = client.post(
        "/api/v1/documents", json={"title": title, "type": "note"}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _create_collection(client, headers, name="Q3 Research"):
    response = client.post("/api/v1/collections", json={"name": name}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_collection_lifecycle(client, auth):
    headers = auth()
    collection_id = _create_collection(client, headers)

    listed = client.get("/api/v1/collections", headers=headers).json()
    assert any(c["id"] == collection_id for c in listed)

    client.delete(f"/api/v1/collections/{collection_id}", headers=headers)
    listed = client.get("/api/v1/collections", headers=headers).json()
    assert not any(c["id"] == collection_id for c in listed)


def test_add_and_remove_document_from_collection(client, auth):
    headers = auth()
    collection_id = _create_collection(client, headers)
    doc_id = _create_doc(client, headers)

    response = client.post(
        f"/api/v1/collections/{collection_id}/documents/{doc_id}", headers=headers
    )
    assert response.status_code == 204

    docs = client.get(f"/api/v1/collections/{collection_id}/documents", headers=headers).json()
    assert [d["id"] for d in docs] == [doc_id]

    client.delete(f"/api/v1/collections/{collection_id}/documents/{doc_id}", headers=headers)
    docs = client.get(f"/api/v1/collections/{collection_id}/documents", headers=headers).json()
    assert docs == []


def test_adding_document_twice_is_idempotent(client, auth):
    headers = auth()
    collection_id = _create_collection(client, headers)
    doc_id = _create_doc(client, headers)

    client.post(f"/api/v1/collections/{collection_id}/documents/{doc_id}", headers=headers)
    response = client.post(
        f"/api/v1/collections/{collection_id}/documents/{doc_id}", headers=headers
    )
    assert response.status_code == 204

    docs = client.get(f"/api/v1/collections/{collection_id}/documents", headers=headers).json()
    assert len(docs) == 1


def test_collection_is_scoped_to_owner(client, auth):
    owner, stranger = auth(), auth()
    collection_id = _create_collection(client, owner)

    assert client.delete(
        f"/api/v1/collections/{collection_id}", headers=stranger
    ).status_code == 404


def test_cannot_add_another_users_document_to_your_collection(client, auth):
    owner, stranger = auth(), auth()
    collection_id = _create_collection(client, owner)
    stranger_doc_id = _create_doc(client, stranger)

    response = client.post(
        f"/api/v1/collections/{collection_id}/documents/{stranger_doc_id}", headers=owner
    )
    assert response.status_code == 404
