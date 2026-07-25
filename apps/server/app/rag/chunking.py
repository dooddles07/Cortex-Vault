import re

from app.core.config import settings

_PARAGRAPH = re.compile(r"\n\s*\n")


def chunk_text(
    text: str, size: int = settings.CHUNK_SIZE, overlap: int = settings.CHUNK_OVERLAP
) -> list[str]:
    """Paragraph-aware windowing: keeps paragraphs intact until the window fills."""
    chunks: list[str] = []
    buffer = ""

    for para in _PARAGRAPH.split(text.strip()):
        para = para.strip()
        if not para:
            continue
        if len(buffer) + len(para) + 2 <= size:
            buffer = f"{buffer}\n\n{para}" if buffer else para
            continue
        if buffer:
            chunks.append(buffer)
            buffer = buffer[-overlap:] + "\n\n" + para if overlap else para
        else:
            chunks.extend(_split_fixed(para, size, overlap))
    if buffer:
        chunks.append(buffer)
    return chunks


def _split_fixed(text: str, size: int, overlap: int) -> list[str]:
    step = max(size - overlap, 1)
    return [text[i : i + size] for i in range(0, len(text), step)]
