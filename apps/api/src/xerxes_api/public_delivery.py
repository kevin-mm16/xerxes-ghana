"""Only approved, separately prepared public objects cross this read-only boundary."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Request

from xerxes_api.db import SessionDep
from xerxes_api.public_media import stream_published_media
from xerxes_api.schemas import PublicMedia

router = APIRouter(prefix="/api/v1/public-media", tags=["public media"])


@router.api_route("/{media_id}/{variant}", methods=["GET", "HEAD"])
def public_media(
    media_id: UUID, variant: Literal["asset", "thumbnail"], request: Request, session: SessionDep
):
    return stream_published_media(
        session, media_id, variant, request.headers.get("range"), head=request.method == "HEAD"
    )


def media_representation(row):
    if not row.get("media_id"):
        return None
    identifier = row["media_id"]
    return PublicMedia(
        id=identifier,
        media_kind=row["media_kind"],
        mime_type=row["media_mime"],
        width=row["media_width"],
        height=row["media_height"],
        duration_seconds=row["media_duration"],
        published_at=row["media_published_at"],
        url=f"/api/v1/public-media/{identifier}/asset",
        thumbnail_url=f"/api/v1/public-media/{identifier}/thumbnail",
    )
