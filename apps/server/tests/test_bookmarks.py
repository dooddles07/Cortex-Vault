import pytest

from app.rag.bookmarks import BookmarkFetchError, _assert_public, _extract


def test_assert_public_rejects_loopback():
    with pytest.raises(BookmarkFetchError):
        _assert_public("http://127.0.0.1/")


def test_assert_public_rejects_link_local_metadata_address():
    """169.254.169.254 is the cloud-provider metadata endpoint on AWS/GCP/Azure
    — the canonical SSRF target."""
    with pytest.raises(BookmarkFetchError):
        _assert_public("http://169.254.169.254/latest/meta-data/")


def test_assert_public_rejects_private_network():
    with pytest.raises(BookmarkFetchError):
        _assert_public("http://10.0.0.5/")


def test_assert_public_rejects_non_http_scheme():
    with pytest.raises(BookmarkFetchError):
        _assert_public("file:///etc/passwd")


def test_assert_public_allows_a_public_address():
    # An IP literal resolves without a real DNS lookup, so this stays offline.
    _assert_public("http://8.8.8.8/")


def test_extract_pulls_readable_text_and_title():
    html = """
    <html><head><title>Hybrid retrieval notes</title></head>
    <body>
      <nav>Skip this nav link</nav>
      <article>
        <h1>Hybrid retrieval notes</h1>
        <p>Vector search and keyword search are fused with reciprocal rank fusion.</p>
      </article>
    </body></html>
    """

    title, text = _extract(html)

    assert title == "Hybrid retrieval notes"
    assert "reciprocal rank fusion" in text


def test_extract_does_not_crash_on_a_content_free_page():
    """trafilatura falls back to whatever text exists (even nav-only markup)
    rather than raising on a sparse page — this only guards against a crash."""
    html = "<html><head><title>Empty</title></head><body></body></html>"

    _title, text = _extract(html)

    assert text == ""
