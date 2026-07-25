"""Hybrid retrieval against a real database with a live pgvector column.
Covers the fix for `mode` being accepted, echoed, and then ignored."""

from tests.helpers import requires_db

pytestmark = requires_db

CONTENT = (
    "Reciprocal rank fusion merges the vector and keyword arms.\n\n"
    "The arq worker consumes jobs from Redis so ingestion never blocks a request."
)


def _seed(client, headers, content=CONTENT, title="Doc"):
    response = client.post(
        "/api/v1/documents",
        json={"title": title, "type": "note", "content": content},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _search(client, headers, query, mode="hybrid"):
    response = client.get(f"/api/v1/search?q={query}&mode={mode}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_search_finds_ingested_content(client, auth, inline_worker):
    headers = auth()
    _seed(client, headers)

    body = _search(client, headers, "reciprocal%20rank%20fusion")
    assert body["hits"]
    assert "fusion" in body["hits"][0]["content"].lower()


def test_each_mode_uses_a_distinct_code_path(client, auth, inline_worker):
    """Regression: every mode previously returned identical hybrid results."""
    headers = auth()
    _seed(client, headers)

    scores = {}
    for mode in ("hybrid", "semantic", "keyword"):
        body = _search(client, headers, "arq%20worker%20redis", mode)
        assert body["mode"] == mode
        assert body["hits"], f"{mode} returned no hits"
        scores[mode] = body["hits"][0]["score"]

    # RRF, cosine similarity, and ts_rank are on different scales.
    assert len({round(s, 6) for s in scores.values()}) > 1, scores


def test_keyword_mode_matches_exact_tokens(client, auth, inline_worker):
    headers = auth()
    _seed(client, headers)

    assert _search(client, headers, "reciprocal", "keyword")["hits"]


def test_search_is_scoped_to_the_owner(client, auth, inline_worker):
    owner, stranger = auth(), auth()
    _seed(client, owner, title="Private")

    assert _search(client, owner, "fusion")["hits"]
    assert _search(client, stranger, "fusion")["hits"] == []


def test_trashed_documents_are_not_retrievable(client, auth, inline_worker):
    headers = auth()
    doc_id = _seed(client, headers)
    assert _search(client, headers, "fusion")["hits"]

    client.post(f"/api/v1/documents/{doc_id}/trash", headers=headers)
    assert _search(client, headers, "fusion")["hits"] == []
