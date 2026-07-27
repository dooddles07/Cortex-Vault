"""Fetch a URL and extract its readable text, for the bookmark-saver feature.

The server fetches a URL the user controls — an SSRF surface. `_resolve_pinned_ip`
resolves the hostname and rejects private/loopback/link-local/reserved targets
(cloud metadata endpoints included) before every request, and redirects are
followed manually so each hop is checked again rather than trusting httpx's
`follow_redirects` to land somewhere already-validated.

The connection is then made to the validated IP literally (Host header and TLS
SNI/cert verification still target the original hostname via the
`sni_hostname` extension) rather than handing httpx the hostname to resolve a
second time — otherwise an attacker controlling DNS could answer the
validation lookup with a public address and the real connection lookup,
moments later, with a private one (DNS rebinding).
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


def _resolve_pinned_ip(url: httpx.URL) -> str:
    """Resolves the host, rejects it unless every address it maps to is
    public, and returns the address the request must actually connect to —
    the same one just validated, not a fresh lookup made later."""
    if url.scheme not in {"http", "https"}:
        raise BookmarkFetchError("only http:// and https:// URLs are supported")
    if not url.host:
        raise BookmarkFetchError("URL has no host")

    try:
        addrs = socket.getaddrinfo(url.host, None)
    except socket.gaierror as exc:
        raise BookmarkFetchError(f"could not resolve host: {url.host}") from exc

    resolved = [ipaddress.ip_address(sockaddr[0]) for *_rest, sockaddr in addrs]
    for ip in resolved:
        if not ip.is_global:
            raise BookmarkFetchError(f"refusing to fetch a private or reserved address: {ip}")
    return str(resolved[0])


async def fetch_readable(url: str) -> tuple[str, str]:
    """Fetch `url` and return (title, readable_text). Raises BookmarkFetchError."""
    current = url
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=_TIMEOUT) as client:
            for _ in range(_MAX_REDIRECTS + 1):
                parsed = httpx.URL(current)
                ip = await run_in_threadpool(_resolve_pinned_ip, parsed)
                pinned = parsed.copy_with(host=ip)
                request = client.build_request(
                    "GET",
                    pinned,
                    headers={"Host": parsed.host},
                    extensions={"sni_hostname": parsed.host},
                )
                resp = await client.send(request, stream=True)
                try:
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
                finally:
                    await resp.aclose()
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
