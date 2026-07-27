"""Favorites/pinning against a real database."""

from tests.helpers import requires_db

pytestmark = requires_db


def _create_doc(client, headers):
    response = client.post(
        "/api/v1/documents", json={"title": "Doc", "type": "note"}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_star_and_unstar(client, auth):
    headers = auth()
    doc_id = _create_doc(client, headers)

    starred = client.post(f"/api/v1/documents/{doc_id}/star", headers=headers)
    assert starred.status_code == 200
    assert starred.json()["starred"] is True

    unstarred = client.delete(f"/api/v1/documents/{doc_id}/star", headers=headers)
    assert unstarred.json()["starred"] is False


def test_star_is_scoped_to_owner(client, auth):
    owner, stranger = auth(), auth()
    doc_id = _create_doc(client, owner)

    assert client.post(f"/api/v1/documents/{doc_id}/star", headers=stranger).status_code == 404
