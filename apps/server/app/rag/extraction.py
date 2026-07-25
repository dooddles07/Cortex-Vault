"""Turn uploaded bytes into indexable text.

Parsing is CPU-bound and synchronous, so callers must go through
`extract_text`, which offloads to a worker thread rather than blocking the
event loop.
"""

import io
import logging

from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

TEXT_MIMES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "application/json",
    "application/xml",
}

PDF_MIMES = {"application/pdf"}

# A text layer this thin means a scanned document, not an empty one.
_MIN_TEXT_CHARS = 32


class Extraction:
    """Result of parsing an upload."""

    def __init__(self, content: str | None, doc_type: str, status: str) -> None:
        self.content = content
        self.doc_type = doc_type
        self.status = status


def _extract_pdf(raw: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw))
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            # One malformed page should not lose the rest of the document.
            logger.warning("failed to extract a PDF page", exc_info=True)
    return "\n\n".join(p.strip() for p in pages if p.strip()).strip()


def _decode_text(raw: bytes) -> str:
    return raw.decode("utf-8", errors="replace").strip()


async def extract_text(raw: bytes, mime: str, filename: str = "") -> Extraction:
    """Map raw upload bytes to (content, document type, ingest status)."""
    mime = (mime or "").split(";")[0].strip().lower()
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if mime in PDF_MIMES or suffix == "pdf":
        try:
            content = await run_in_threadpool(_extract_pdf, raw)
        except Exception:
            logger.exception("PDF extraction failed for %s", filename)
            return Extraction(None, "pdf", "failed")
        if len(content) < _MIN_TEXT_CHARS:
            # Almost certainly a scan; needs OCR, which is not implemented.
            return Extraction(None, "pdf", "needs_ocr")
        return Extraction(content, "pdf", "pending")

    if mime in TEXT_MIMES or suffix in {"txt", "md", "csv", "json", "xml", "html"}:
        content = await run_in_threadpool(_decode_text, raw)
        if not content:
            return Extraction(None, "note", "skipped_empty")
        return Extraction(content, "note", "pending")

    # Stored but not indexable — images, archives, office formats.
    return Extraction(None, "file", "unsupported")
