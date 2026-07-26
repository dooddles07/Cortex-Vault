import io

from app.rag.extraction import extract_text


def _pdf(lines: list[str]) -> bytes:
    """Minimal single-page PDF with a real text layer, built without a writer
    library so the test does not depend on pypdf's own output being correct."""
    text_ops = "BT /F1 12 Tf 72 720 Td " + " ".join(
        f"({line}) Tj 0 -16 Td" for line in lines
    ) + " ET"
    stream = text_ops.encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + body + b"\nendobj\n")

    xref_at = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode())
    out.write(b"0000000000 65535 f \n")
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode()
    )
    return out.getvalue()


async def test_pdf_text_is_extracted():
    raw = _pdf(["CortexVault stores embeddings in pgvector.", "Retrieval is hybrid."])
    result = await extract_text(raw, "application/pdf", "notes.pdf")

    assert result.doc_type == "pdf"
    assert result.status == "pending"
    assert "pgvector" in result.content


async def test_pdf_without_text_layer_is_flagged_for_ocr():
    """A scan has no text layer. It must not silently look like an empty file."""
    raw = _pdf([])
    result = await extract_text(raw, "application/pdf", "scan.pdf")

    assert result.doc_type == "pdf"
    assert result.status == "needs_ocr"
    assert result.content is None


async def test_corrupt_pdf_is_marked_failed_not_crashed():
    result = await extract_text(b"%PDF-1.4 garbage", "application/pdf", "broken.pdf")

    assert result.status == "failed"
    assert result.content is None


async def test_pdf_detected_by_extension_when_mime_is_generic():
    raw = _pdf(["Detected by file suffix rather than the declared MIME type."])
    result = await extract_text(raw, "application/octet-stream", "report.pdf")

    assert result.doc_type == "pdf"
    assert "suffix" in result.content


async def test_very_short_pdf_is_treated_as_a_scan():
    """Documented tradeoff: a text layer under 32 characters is assumed to be a
    scan. A genuinely tiny PDF is a false positive, but silently indexing a
    scanned page as empty is the worse failure."""
    raw = _pdf(["Paid."])
    result = await extract_text(raw, "application/pdf", "receipt.pdf")

    assert result.status == "needs_ocr"


async def test_plain_text_is_decoded():
    result = await extract_text(b"hello vault", "text/plain", "a.txt")

    assert result.doc_type == "note"
    assert result.status == "pending"
    assert result.content == "hello vault"


async def test_empty_text_file_is_skipped():
    result = await extract_text(b"   \n  ", "text/plain", "blank.txt")

    assert result.status == "skipped_empty"
    assert result.content is None


async def test_unrecognized_binary_is_stored_but_marked_unsupported():
    result = await extract_text(b"\x50\x4b\x03\x04archive", "application/zip", "bundle.zip")

    assert result.doc_type == "file"
    assert result.status == "unsupported"
    assert result.content is None


async def test_invalid_image_falls_back_to_needs_ocr():
    """A malformed image can't be opened, so OCR can't run on it. Same
    fallback as a scanned PDF: flagged for OCR rather than crashing."""
    result = await extract_text(b"\x89PNG\r\n", "image/png", "shot.png")

    assert result.doc_type == "image"
    assert result.status == "needs_ocr"
    assert result.content is None


async def test_docx_without_python_docx_installed_is_marked_failed_not_crashed():
    """Guards the failure path if the docx extractor ever raises — a broken
    or unsupported .docx must not crash the upload."""
    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    result = await extract_text(b"not a real docx", docx_mime, "notes.docx")

    assert result.doc_type == "docx"
    assert result.status == "failed"
    assert result.content is None


async def test_pptx_detected_by_extension():
    result = await extract_text(b"not a real pptx", "application/octet-stream", "deck.pptx")

    assert result.doc_type == "pptx"
    assert result.status == "failed"


async def test_xlsx_detected_by_extension():
    result = await extract_text(b"not a real xlsx", "application/octet-stream", "sheet.xlsx")

    assert result.doc_type == "xlsx"
    assert result.status == "failed"


async def test_invalid_utf8_does_not_raise():
    result = await extract_text(b"caf\xff\xfe bar", "text/plain", "weird.txt")

    assert result.content is not None
