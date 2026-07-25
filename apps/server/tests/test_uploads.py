import io

import pytest
from fastapi import HTTPException, UploadFile

from app.api.v1.uploads import _TEXT_TYPES, _TYPE_BY_MIME, _read_capped


def _upload(data: bytes) -> UploadFile:
    return UploadFile(filename="f.txt", file=io.BytesIO(data))


async def test_read_under_cap_returns_content():
    assert await _read_capped(_upload(b"hello"), 1024) == b"hello"


async def test_read_over_cap_raises_413():
    with pytest.raises(HTTPException) as exc:
        await _read_capped(_upload(b"x" * 2048), 1024)
    assert exc.value.status_code == 413


def test_pdf_is_not_labelled_as_note():
    assert _TYPE_BY_MIME["application/pdf"] == "pdf"


def test_unknown_mime_falls_back_to_file_not_pdf():
    assert _TYPE_BY_MIME.get("image/png", "file") == "file"


def test_pdf_is_not_decoded_as_text():
    assert "application/pdf" not in _TEXT_TYPES
