"""Tags against a real database: CRUD, document attachment, and ownership."""

from tests.helpers import requires_db

pytestmark = requires_db


def _create_doc(client, headers, title="Doc"):
    response = client.post(
        "/api/v1/documents", json={"title": title, "type": "note"}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _create_tag(client, headers, name="research"):
    response = client.post("/api/v1/tags", json={"name": name}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_attach_and_detach_tag_from_document(client, auth):
    headers = auth()
    doc_id = _create_doc(client, headers)
    tag_id = _create_tag(client, headers)

    response = client.post(
        f"/api/v1/documents/{doc_id}/tags/{tag_id}", headers=headers
    )
    assert response.status_code == 204

    response = client.delete(
        f"/api/v1/documents/{doc_id}/tags/{tag_id}", headers=headers
    )
    assert response.status_code == 204


def test_cannot_attach_another_users_tag(client, auth):
    owner_headers = auth()
    tag_id = _create_tag(client, owner_headers)

    attacker_headers = auth()
    doc_id = _create_doc(client, attacker_headers)

    response = client.post(
        f"/api/v1/documents/{doc_id}/tags/{tag_id}", headers=attacker_headers
    )
    assert response.status_code == 404


def test_cannot_detach_another_users_tag(client, auth):
    owner_headers = auth()
    tag_id = _create_tag(client, owner_headers)

    # Attacker owns the document but not the tag — isolates the tag-ownership
    # check from the document-ownership check already covered above.
    attacker_headers = auth()
    doc_id = _create_doc(client, attacker_headers)

    response = client.delete(
        f"/api/v1/documents/{doc_id}/tags/{tag_id}", headers=attacker_headers
    )
    assert response.status_code == 404
