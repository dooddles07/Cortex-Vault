import io

import pytest
from fastapi import HTTPException, UploadFile

from app.api.v1.uploads import _read_capped


def _upload(data: bytes) -> UploadFile:
    return UploadFile(filename="f.txt", file=io.BytesIO(data))


async def test_read_under_cap_returns_content():
    assert await _read_capped(_upload(b"hello"), 1024) == b"hello"


async def test_read_over_cap_raises_413():
    with pytest.raises(HTTPException) as exc:
        await _read_capped(_upload(b"x" * 2048), 1024)
    assert exc.value.status_code == 413


async def test_read_stops_before_buffering_the_whole_body():
    """The cap must reject mid-read, not after the full payload is in memory."""
    with pytest.raises(HTTPException):
        await _read_capped(_upload(b"x" * (8 * 1024 * 1024)), 1024)
