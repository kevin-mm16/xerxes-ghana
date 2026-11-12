"""No raw text, geography, credentials or capability tokens in generic audit details."""

from xerxes_api.moderation_models import ModerationAuditEvent

ALLOWED_DETAILS = {
    "reviewerId",
    "reviewStatus",
    "publicationStatus",
    "mediaId",
    "version",
    "policy",
}


def record_event(session, observation_id, reviewer_id, action, details=None, *, private_note=""):
    details = details or {}
    if set(details) - ALLOWED_DETAILS:
        raise ValueError("Sensitive or unsupported audit metadata")
    if len(private_note) > 1000:
        raise ValueError("Reviewer note is too long")
    session.add(
        ModerationAuditEvent(
            observation_id=observation_id,
            reviewer_id=reviewer_id,
            action=action,
            details=details,
            private_note=private_note,
        )
    )
