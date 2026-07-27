"""Search filters (type/folder/tag/date) against a real database."""

from tests.helpers import requires_db

pytestmark = requires_db

CONTENT_A = "Reciprocal rank fusion merges the vector and keyword arms of retrieval."
CONTENT_B = "Reciprocal rank fusion also appears in this second unrelated document."


def _create_doc(client, headers, content, doc_type="note", folder_id=None):
    payload = {"title": "Doc", "type": doc_type, "content": content}
    if folder_id:
        payload["folder_id"] = folder_id
    response = client.post("/api/v1/documents", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _search(client, headers, **params):
    query = "&".join(f"{k}={v}" for k, v in params.items())
    response = client.get(f"/api/v1/search?q=fusion&{query}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_filter_by_type_excludes_other_types(client, auth, inline_worker):
    headers = auth()
    _create_doc(client, headers, CONTENT_A, doc_type="note")
    _create_doc(client, headers, CONTENT_B, doc_type="pdf")

    body = _search(client, headers, type="pdf")
    assert body["hits"]
    assert all("second unrelated" in h["content"] for h in body["hits"])


def test_filter_by_folder(client, auth, inline_worker):
    headers = auth()
    folder = client.post("/api/v1/folders", json={"name": "Research"}, headers=headers).json()
    _create_doc(client, headers, CONTENT_A)
    _create_doc(client, headers, CONTENT_B, folder_id=folder["id"])

    body = _search(client, headers, folder_id=folder["id"])
    assert body["hits"]
    assert all("second unrelated" in h["content"] for h in body["hits"])


def test_filter_by_tag(client, auth, inline_worker):
    headers = auth()
    doc_a = _create_doc(client, headers, CONTENT_A)
    _create_doc(client, headers, CONTENT_B)

    tag = client.post("/api/v1/tags", json={"name": "priority"}, headers=headers).json()
    client.post(f"/api/v1/documents/{doc_a}/tags/{tag['id']}", headers=headers)

    body = _search(client, headers, tag_id=tag["id"])
    assert body["hits"]
    assert all("vector and keyword" in h["content"] for h in body["hits"])


def test_filter_by_date_range_excludes_everything_outside_it(client, auth, inline_worker):
    headers = auth()
    _create_doc(client, headers, CONTENT_A)

    body = _search(client, headers, date_from="2099-01-01")
    assert body["hits"] == []
