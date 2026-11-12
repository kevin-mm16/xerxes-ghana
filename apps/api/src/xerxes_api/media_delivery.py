"""Bounded authenticated/application-gated media delivery; no browser object keys."""

import re
from collections.abc import Callable
from contextlib import AbstractContextManager
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import Response, StreamingResponse

from xerxes_api.evidence_storage import StorageError, get_evidence_storage

_RANGE = re.compile(r"bytes=([0-9]*)-([0-9]*)\Z")
_FILENAME = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}\Z")


class _MediaStreamingResponse(StreamingResponse):
    """Close provider copies on cancellation and send failures as well as EOF."""

    def __init__(self, *args, close_source: Callable, **kwargs):
        super().__init__(*args, **kwargs)
        self.close_source = close_source

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            self.close_source()


def _byte_range(value: str | None, size: int) -> tuple[int, int, bool]:
    if value is None:
        return 0, size - 1, False
    match = _RANGE.fullmatch(value) if len(value) <= 128 else None
    if not match or not any(match.groups()):
        raise HTTPException(
            416, "Unsupported byte range", headers={"Content-Range": f"bytes */{size}"}
        )
    first, last = match.groups()
    if not first:
        count = int(last)
        if count <= 0:
            raise HTTPException(
                416, "Unsatisfiable byte range", headers={"Content-Range": f"bytes */{size}"}
            )
        return max(0, size - count), size - 1, True
    start, end = int(first), int(last) if last else size - 1
    if start >= size or start > end:
        raise HTTPException(
            416, "Unsatisfiable byte range", headers={"Content-Range": f"bytes */{size}"}
        )
    return start, min(end, size - 1), True


def stream_media(
    source: AbstractContextManager[Path],
    mime: str,
    range_header: str | None,
    filename: str,
    *,
    head: bool = False,
) -> Response:
    """Caller must authorize before calling; errors never include private paths.

    Keep the provider's copy context open until the stream finishes, including
    when a future provider downloads an authorized object into temporary storage.
    Every GET/HEAD/range request needs a fresh authorization/publication check.
    """
    if mime not in {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"}:
        raise HTTPException(404, "Media unavailable")
    if not _FILENAME.fullmatch(filename):
        raise HTTPException(404, "Media unavailable")
    entered = False
    try:
        path = source.__enter__()
        entered = True
        size = path.stat().st_size
        if size < 1:
            raise StorageError()
        start, end, partial = _byte_range(range_header, size)
        headers = {
            "Content-Length": str(end - start + 1),
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store, private",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "X-Robots-Tag": "noindex, nofollow",
        }
        if partial:
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        if head:
            source.__exit__(None, None, None)
            entered = False
            return Response(status_code=206 if partial else 200, media_type=mime, headers=headers)

        def chunks():
            with path.open("rb") as media:
                media.seek(start)
                remaining = end - start + 1
                while remaining:
                    chunk = media.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        response = _MediaStreamingResponse(
            chunks(),
            status_code=206 if partial else 200,
            media_type=mime,
            headers=headers,
            close_source=lambda: source.__exit__(None, None, None),
        )
        entered = False  # The response owns the provider context from here.
        return response
    except (StorageError, OSError):
        raise HTTPException(404, "Media unavailable") from None
    finally:
        if entered:
            source.__exit__(None, None, None)


def stream_private_media(
    key: str,
    mime: str,
    range_header: str | None,
    filename: str,
    *,
    head: bool = False,
) -> Response:
    """Internal only: root route must select the key after reviewer authorization."""
    try:
        return stream_media(
            get_evidence_storage().local_copy(key), mime, range_header, filename, head=head
        )
    except StorageError:
        raise HTTPException(404, "Media unavailable") from None
