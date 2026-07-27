import re

import tiktoken

from app.core.config import settings

_PARAGRAPH = re.compile(r"\n\s*\n")

# cl100k_base is a generic BPE encoding (GPT-3.5/4's), not Gemini's or Groq's
# own tokenizer — there's no public tokenizer for either. The goal here is
# "roughly proportional to real token count across content types" rather than
# an exact match, which a raw character count cannot give at all: CJK text or
# dense code carries far more tokens per character than English prose.
_ENCODING = tiktoken.get_encoding("cl100k_base")


def _token_len(text: str) -> int:
    return len(_ENCODING.encode(text))


def chunk_text(
    text: str, size: int = settings.CHUNK_SIZE, overlap: int = settings.CHUNK_OVERLAP
) -> list[str]:
    """Paragraph-aware windowing, sized in tokens: keeps paragraphs intact
    until the window fills."""
    chunks: list[str] = []
    buffer = ""
    buffer_tokens = 0

    for para in _PARAGRAPH.split(text.strip()):
        para = para.strip()
        if not para:
            continue
        para_tokens = _token_len(para)
        if buffer_tokens + para_tokens <= size:
            buffer = f"{buffer}\n\n{para}" if buffer else para
            buffer_tokens += para_tokens
            continue
        if buffer:
            chunks.append(buffer)
            tail = _last_tokens(buffer, overlap) if overlap else ""
            buffer = f"{tail}\n\n{para}" if tail else para
            buffer_tokens = _token_len(buffer)
        else:
            chunks.extend(_split_fixed(para, size, overlap))
            buffer = ""
            buffer_tokens = 0
    if buffer:
        chunks.append(buffer)
    return chunks


def _last_tokens(text: str, n: int) -> str:
    """The trailing `n` tokens of `text`, decoded back to a string, so a fact
    spanning a chunk boundary is still retrievable from at least one chunk."""
    ids = _ENCODING.encode(text)
    return _ENCODING.decode(ids[-n:]) if len(ids) > n else text


def _split_fixed(text: str, size: int, overlap: int) -> list[str]:
    ids = _ENCODING.encode(text)
    step = max(size - overlap, 1)
    return [_ENCODING.decode(ids[i : i + size]) for i in range(0, len(ids), step)]
