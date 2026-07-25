import json

from app.services.chat_service import _sse


def test_sse_frame_format():
    frame = _sse("token", {"delta": "hi"})
    assert frame.startswith("event: token\ndata: ")
    assert frame.endswith("\n\n")


def test_sse_payload_roundtrips():
    payload = [{"index": 1, "document_title": 'quotes "and" \n newlines'}]
    body = _sse("citations", payload).split("data: ", 1)[1].strip()
    assert json.loads(body) == payload


def test_sse_data_is_single_line():
    # A literal newline inside data: would split the frame and corrupt the stream.
    frame = _sse("token", {"delta": "line1\nline2"})
    assert len(frame.rstrip("\n").split("\n")) == 2
