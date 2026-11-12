"""Short-lived upload capabilities. Neither originals nor review copies have public URLs."""

import asyncio
import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy import case, func, select, text

from xerxes_api.db import SessionDep
from xerxes_api.evidence_storage import StorageError, get_evidence_storage
from xerxes_api.media_processing import sniff_media_type
from xerxes_api.models import EvidenceMedia, MediaProcessingJob
from xerxes_api.schemas import MediaStatus, UploadIntentInput, UploadIntentReceipt

router = APIRouter(prefix="/api/v1/uploads", tags=["private media intake"])
MAX_PENDING_UPLOADS = 32
MAX_INTENTS_PER_HOUR = 100
MAX_RESERVED_BYTES = 2 * 1024**3
IMAGE_LIMIT = 10 * 1024**2
VIDEO_LIMIT = 50 * 1024**2
EXTENSIONS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
}
ACCEPTED_UPLOAD_STATES = {"quarantined", "processing", "review_ready"}


def media_status(media: EvidenceMedia):
    return MediaStatus(
        id=media.id,
        processing_status=media.processing_status,
        media_kind=media.media_kind,
        error_code=media.processing_error,
    )


def authorized_media(session, media_id: UUID, token: str | None, *, lock=False):
    query = select(EvidenceMedia).where(EvidenceMedia.id == media_id)
    if lock:
        query = query.with_for_update()
    media = session.execute(query).scalar_one_or_none()
    candidate = hashlib.sha256((token or "").encode()).hexdigest()
    if media is None or not secrets.compare_digest(candidate, media.upload_token_hash):
        raise HTTPException(404, "Upload not found")
    if media.expires_at <= datetime.now(UTC):
        raise HTTPException(
            410, "Upload permission expired. Select the file again to start a new upload."
        )
    return media


def bearer(request: Request):
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer ") or len(header) > 160:
        return None
    return header[7:]


async def intent_input(request: Request):
    payload = bytearray()
    try:
        async with asyncio.timeout(15):
            async for chunk in request.stream():
                if len(payload) + len(chunk) > 16384:
                    raise HTTPException(413, "Upload declaration is too large")
                payload.extend(chunk)
        if not request.headers.get("content-type", "").startswith("application/json"):
            raise HTTPException(415, "JSON is required")
        return UploadIntentInput.model_validate(json.loads(payload))
    except (ValidationError, ValueError):
        raise HTTPException(422, "Provide a supported filename, type, size, and consent") from None
    except TimeoutError:
        raise HTTPException(408, "Upload declaration timed out") from None


@router.post(
    "/intents",
    status_code=201,
    response_model=UploadIntentReceipt,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {"schema": UploadIntentInput.model_json_schema(by_alias=True)}
            },
        }
    },
)
async def create_intent(request: Request, session: SessionDep):
    if request.query_params:
        raise HTTPException(400, "Upload permissions belong in the Authorization header")
    body = await intent_input(request)
    suffix = Path(body.filename).suffix.lower()
    if EXTENSIONS.get(suffix) != body.content_type:
        raise HTTPException(422, "The filename and media type must match a supported format")
    limit = IMAGE_LIMIT if body.content_type.startswith("image/") else VIDEO_LIMIT
    if body.file_size > limit:
        raise HTTPException(413, "Images must be at most 10 MiB and videos at most 50 MiB")
    try:
        get_evidence_storage()
    except StorageError:
        raise HTTPException(503, "Private evidence storage is unavailable") from None
    # Persistent global budgets avoid storing IP addresses and survive API restarts.
    # These conservative development controls are not a complete external-beta abuse policy.
    session.execute(text("SELECT pg_advisory_xact_lock(hashtext('xerxes:upload-budget'))"))
    now = datetime.now(UTC)
    pending = session.scalar(
        select(func.count())
        .select_from(EvidenceMedia)
        .where(
            EvidenceMedia.processing_status.in_(
                ["awaiting_upload", "uploading", "quarantined", "processing"]
            ),
            (EvidenceMedia.expires_at > now)
            | EvidenceMedia.processing_status.in_(["quarantined", "processing"]),
        )
    )
    hourly = session.scalar(
        select(func.count())
        .select_from(EvidenceMedia)
        .where(EvidenceMedia.created_at > now - timedelta(hours=1))
    )
    # Reserve worst-case derivatives for all three attempts, including interrupted
    # writes. Permission expiry does not release bytes; confirmed cleanup does.
    derivative_budget = case(
        (EvidenceMedia.media_kind == "video", VIDEO_LIMIT + 2 * 1024**2),
        else_=IMAGE_LIMIT + 2 * 1024**2,
    )
    reserved = session.scalar(
        select(
            func.coalesce(func.sum(EvidenceMedia.expected_size + 3 * derivative_budget), 0)
        ).where(EvidenceMedia.processing_status != "expired")
    )
    if pending >= MAX_PENDING_UPLOADS or hourly >= MAX_INTENTS_PER_HOUR:
        raise HTTPException(
            429,
            "The private upload queue is full. Please try again later.",
            headers={"Retry-After": "300"},
        )
    new_reservation = body.file_size + 3 * (limit + 2 * 1024**2)
    if reserved + new_reservation > MAX_RESERVED_BYTES:
        raise HTTPException(
            429, "Private storage capacity has been reserved. Please try again later."
        )
    media_id, token = uuid4(), secrets.token_urlsafe(32)
    media = EvidenceMedia(
        id=media_id,
        upload_token_hash=hashlib.sha256(token.encode()).hexdigest(),
        original_filename=body.filename,
        declared_mime_type=body.content_type,
        expected_size=body.file_size,
        original_object_key=f"quarantine/{media_id}/original",
        media_kind="image" if body.content_type.startswith("image/") else "video",
        processing_status="awaiting_upload",
        expires_at=now + timedelta(minutes=30),
    )
    session.add(media)
    session.commit()
    return UploadIntentReceipt(
        id=media_id,
        upload_token=token,
        upload_url=f"/api/v1/uploads/{media_id}/content",
        expires_at=media.expires_at,
        max_bytes=limit,
    )


@router.get("/{media_id}", response_model=MediaStatus, response_model_exclude_none=True)
def upload_status(media_id: UUID, request: Request, session: SessionDep):
    if request.query_params:
        raise HTTPException(400, "Upload permissions belong in the Authorization header")
    return media_status(authorized_media(session, media_id, bearer(request)))


@router.put("/{media_id}/content", response_model=MediaStatus, response_model_exclude_none=True)
async def upload_content(media_id: UUID, request: Request, session: SessionDep):
    if request.query_params:
        raise HTTPException(400, "Upload permissions belong in the Authorization header")
    media = authorized_media(session, media_id, bearer(request), lock=True)
    if media.processing_status in ACCEPTED_UPLOAD_STATES:
        # A lost success response can be retried; the stored original is never replaced.
        return media_status(media)
    if media.processing_status != "awaiting_upload":
        raise HTTPException(409, "This upload is already in progress or cannot be reused")
    if request.headers.get("content-type") != "application/octet-stream":
        raise HTTPException(415, "Upload the file as application/octet-stream")
    declared_length = request.headers.get("content-length")
    if declared_length is not None:
        try:
            if int(declared_length) != media.expected_size:
                raise ValueError
        except ValueError:
            raise HTTPException(422, "File size differs from the upload declaration") from None
    try:
        storage = get_evidence_storage()
        temporary = storage.temporary_path()
    except StorageError:
        raise HTTPException(503, "Private evidence storage is unavailable") from None
    media.processing_status = "uploading"
    expected_size, original_key = media.expected_size, media.original_object_key
    declared_mime = media.declared_mime_type
    session.commit()
    digest = hashlib.sha256()
    prefix, size = bytearray(), 0
    try:
        async with asyncio.timeout(300):
            with temporary.open("wb") as target:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > expected_size:
                        raise HTTPException(413, "File exceeds its declared size")
                    digest.update(chunk)
                    prefix.extend(chunk[: max(0, 4096 - len(prefix))])
                    await asyncio.to_thread(target.write, chunk)
        if size != expected_size:
            raise HTTPException(422, "The upload is incomplete")
        detected = sniff_media_type(bytes(prefix))
        if detected != declared_mime:
            raise HTTPException(422, "The file contents do not match the declared media type")
        await asyncio.to_thread(storage.put_file, original_key, temporary)
        media = session.get(EvidenceMedia, media_id, with_for_update=True, populate_existing=True)
        if media.processing_status != "uploading":
            raise HTTPException(409, "This upload permission is no longer active")
        media.file_size, media.original_sha256 = size, digest.hexdigest()
        media.detected_mime_type = detected
        media.processing_status = "quarantined"
        session.add(MediaProcessingJob(media_id=media.id, status="queued", attempts=0))
        session.commit()
        return media_status(media)
    except BaseException as exc:
        session.rollback()
        row = session.get(EvidenceMedia, media_id)
        if row and row.processing_status == "uploading":
            row.processing_status = "failed"
            row.processing_error = "upload_failed"
            session.commit()
        if isinstance(exc, TimeoutError):
            raise HTTPException(408, "Upload timed out") from None
        if isinstance(exc, (StorageError, OSError)):
            raise HTTPException(503, "Private evidence storage is unavailable") from None
        raise
    finally:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass  # Staging reconciliation removes old incomplete files.
