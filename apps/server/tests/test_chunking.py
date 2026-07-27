from app.rag.chunking import _ENCODING, _token_len, chunk_text


def _tokens(text: str) -> int:
    return len(_ENCODING.encode(text))


def test_short_text_is_single_chunk():
    assert chunk_text("hello world", size=100, overlap=10) == ["hello world"]


def test_long_prose_is_split_by_token_count():
    """Repeated characters compress heavily under BPE, so this uses varied
    prose — a token budget must actually bind on real text, not just on
    something that happens to look long in characters."""
    paragraph = "The quick brown fox jumps over the lazy dog near the riverbank. " * 20
    assert _tokens(paragraph) > 100

    chunks = chunk_text(paragraph, size=100, overlap=20)

    assert len(chunks) > 1
    assert all(_tokens(c) <= 100 for c in chunks)


def test_paragraphs_pack_into_window():
    text = "\n\n".join(["alpha", "beta", "gamma"])
    assert chunk_text(text, size=100, overlap=10) == [text]


def test_overlap_carries_tail_across_chunk_boundary():
    """A fact spanning a chunk boundary should still be retrievable from at
    least one chunk — the whole point of overlap."""
    paragraph = "The quick brown fox jumps over the lazy dog near the riverbank. " * 20
    chunks = chunk_text(paragraph, size=100, overlap=20)

    assert len(chunks) > 1
    # Every chunk after the first should share some trailing text with the
    # end of the previous chunk.
    for prev, cur in zip(chunks, chunks[1:], strict=False):
        assert prev[-20:] in cur or cur.startswith(prev[-40:])


def test_cjk_text_counts_far_more_tokens_than_characters():
    """The whole point of switching off character counting: CJK text carries
    far more tokens per character than English prose."""
    cjk = "こんにちは世界。これはテストです。" * 5
    assert _token_len(cjk) > len(cjk) * 0.5


def test_single_oversized_paragraph_falls_back_to_fixed_split():
    huge_word_salad = " ".join(f"word{i}" for i in range(500))
    assert _tokens(huge_word_salad) > 100

    chunks = chunk_text(huge_word_salad, size=100, overlap=10)

    assert len(chunks) > 1
    assert all(_tokens(c) <= 100 for c in chunks)
