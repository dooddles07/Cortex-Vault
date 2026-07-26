"""Fetch a URL and extract its readable text, for the bookmark-saver feature.

The server fetches a URL the user controls — an SSRF surface. `_assert_public`
resolves the hostname and rejects private/loopback/link-local/reserved
targets (cloud metadata endpoints included) before every request, and
redirects are followed manually so each hop is checked again rather than
trusting httpx's `follow_redirects` to land somewhere already-validated.
"""

import ipaddress
import logging
import socket

import httpx
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

# Capped the same way uploads are: read in chunks, reject before buffering an
# unbounded response body.
_MAX_FETCH_BYTES = 10 * 1024 * 1024
_TIMEOUT = 15.0
_MAX_REDIRECTS = 5


class BookmarkFetchError(Exception):
    """Raised when a URL cannot be fetched or yields no readable content."""


def _assert_public(url: str) -> None:
    parsed = httpx.URL(url)
    if parsed.scheme not in {"http", "https"}:
        raise BookmarkFetchError("only http:// and https:// URLs are supported")
    if not parsed.host:
        raise BookmarkFetchError("URL has no host")

    try:
        addrs = socket.getaddrinfo(parsed.host, None)
    except socket.gaierror as exc:
        raise BookmarkFetchError(f"could not resolve host: {parsed.host}") from exc

    for _family, _type, _proto, _canonname, sockaddr in addrs:
        ip = ipaddress.ip_address(sockaddr[0])
        if not ip.is_global:
            raise BookmarkFetchError(f"refusing to fetch a private or reserved address: {ip}")


async def fetch_readable(url: str) -> tuple[str, str]:
    """Fetch `url` and return (title, readable_text). Raises BookmarkFetchError."""
    current = url
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=_TIMEOUT) as client:
            for _ in range(_MAX_REDIRECTS + 1):
                await run_in_threadpool(_assert_public, current)
                async with client.stream("GET", current) as resp:
                    if resp.is_redirect:
                        current = str(resp.headers["location"])
                        continue
                    resp.raise_for_status()
                    buffer = bytearray()
                    async for chunk in resp.aiter_bytes(1024 * 64):
                        buffer.extend(chunk)
                        if len(buffer) > _MAX_FETCH_BYTES:
                            raise BookmarkFetchError("page exceeds the fetch size limit")
                    html = bytes(buffer).decode(resp.encoding or "utf-8", errors="replace")
                    break
            else:
                raise BookmarkFetchError("too many redirects")
    except httpx.HTTPError as exc:
        raise BookmarkFetchError(str(exc)) from exc

    title, text = await run_in_threadpool(_extract, html)
    if not text:
        raise BookmarkFetchError("no readable content found on that page")
    return title, text


def _extract(html: str) -> tuple[str, str]:
    import trafilatura

    text = trafilatura.extract(html, include_comments=False, include_tables=True) or ""
    metadata = trafilatura.extract_metadata(html)
    title = metadata.title if metadata and metadata.title else ""
    return title, text.strip()
