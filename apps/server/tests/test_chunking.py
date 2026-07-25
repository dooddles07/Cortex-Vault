from app.rag.chunking import chunk_text


def test_short_text_is_single_chunk():
    assert chunk_text("hello world", size=100, overlap=10) == ["hello world"]


def test_long_paragraph_is_split():
    chunks = chunk_text("x" * 500, size=100, overlap=20)
    assert len(chunks) > 1
    assert all(len(c) <= 100 for c in chunks)


def test_paragraphs_pack_into_window():
    text = "\n\n".join(["alpha", "beta", "gamma"])
    assert chunk_text(text, size=100, overlap=10) == [text]
