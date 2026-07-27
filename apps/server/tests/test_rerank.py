import uuid

from app.rag.rerank import _parse_order, rerank
from app.rag.retrieval import RetrievedChunk


def _chunk(content: str) -> RetrievedChunk:
    return RetrievedChunk(uuid.uuid4(), uuid.uuid4(), "Doc", content, 1.0)


def test_parse_order_reads_comma_separated_numbers():
    assert _parse_order("2, 1, 3", count=3) == [1, 0, 2]


def test_parse_order_drops_out_of_range_numbers():
    assert _parse_order("1, 9, 2", count=3) == [0, 1]


def test_parse_order_deduplicates():
    assert _parse_order("1, 1, 2", count=3) == [0, 1]


def test_parse_order_tolerates_a_trailing_period():
    # A close-enough response to the requested format shouldn't be discarded
    # just because the model appended punctuation.
    assert _parse_order("2, 1, 3.", count=3) == [1, 0, 2]


def test_parse_order_returns_empty_for_prose_not_matching_the_requested_format():
    """The prompt asks for numbers only, comma-separated — free-form prose is
    treated as a failed parse (safe fallback to RRF order), not scraped for
    digits that happen to appear in it."""
    assert _parse_order("The most relevant are 2 and 1.", count=3) == []
    assert _parse_order("I cannot determine relevance.", count=3) == []


async def test_rerank_reorders_by_llm_response(monkeypatch):
    candidates = [_chunk("first"), _chunk("second"), _chunk("third")]

    class _Provider:
        async def stream(self, messages):
            for tok in ["3", ",", "1"]:
                yield tok

    monkeypatch.setattr("app.rag.rerank.get_chat_provider", lambda: _Provider())

    result = await rerank("q", candidates, top_n=2)

    assert [c.content for c in result] == ["third", "first"]


async def test_rerank_falls_back_to_rrf_order_on_unparseable_response(monkeypatch):
    candidates = [_chunk("first"), _chunk("second"), _chunk("third")]

    class _Provider:
        async def stream(self, messages):
            yield "I don't know."

    monkeypatch.setattr("app.rag.rerank.get_chat_provider", lambda: _Provider())

    result = await rerank("q", candidates, top_n=2)

    assert [c.content for c in result] == ["first", "second"]


async def test_rerank_falls_back_to_rrf_order_on_provider_failure(monkeypatch):
    candidates = [_chunk("first"), _chunk("second")]

    class _BoomProvider:
        async def stream(self, messages):
            raise RuntimeError("simulated provider failure")
            yield  # pragma: no cover - unreachable; makes this an async generator

    monkeypatch.setattr("app.rag.rerank.get_chat_provider", lambda: _BoomProvider())

    result = await rerank("q", candidates, top_n=2)

    assert [c.content for c in result] == ["first", "second"]


async def test_rerank_returns_empty_list_unchanged():
    assert await rerank("q", [], top_n=5) == []
