"""Server-verified opaque reviewer sessions and browser request protections.

Password hashing is delegated to pwdlib's Argon2 implementation. Session tokens
are random capabilities; only their SHA-256 digest is persisted. No JWT signing,
custom password hashing, browser-local credential state or public reviewer API.
"""

import hashlib
import ipaddress
import os
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import delete, select, text, update

from xerxes_api.auth_models import AuthLoginThrottle, Reviewer, ReviewerSession
from xerxes_api.auth_schemas import AuthSession, LoginInput, ReviewerIdentity
from xerxes_api.db import SessionDep

router = APIRouter(prefix="/api/v1/auth", tags=["reviewer authentication"])
COOKIE_NAME = "xerxes_session"
COOKIE_PATH = "/api/v1"
SESSION_LIFETIME = timedelta(hours=8)
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}\Z")
PASSWORD_HASH = PasswordHash.recommended()
_DUMMY_HASH = PASSWORD_HASH.hash(secrets.token_urlsafe(32))
_ATTEMPT_WINDOW = timedelta(minutes=15)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def production() -> bool:
    return os.environ.get("APP_ENV") not in {"development", "test"}


def trusted_origins() -> set[str]:
    configured = os.environ.get("APP_PUBLIC_ORIGINS", "")
    origins = {value.strip() for value in configured.split(",") if value.strip()}
    if not origins and not production():
        origins = {"http://localhost:3000", "http://127.0.0.1:3000"}
    for origin in origins:
        try:
            parsed = urlsplit(origin)
            _ = parsed.port
        except ValueError:
            raise HTTPException(503, "Reviewer browser origins are not configured safely") from None
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
            or (production() and parsed.scheme != "https")
        ):
            raise HTTPException(503, "Reviewer browser origins are not configured safely")
    if not origins:
        raise HTTPException(503, "Reviewer browser origins are not configured")
    return origins


def require_valid_origin(request: Request) -> None:
    # An exact Origin allowlist is also required for login to prevent login CSRF.
    # This API has no credentialed CORS support; the same-origin web proxy must
    # preserve the browser Origin instead of substituting its own trusted value.
    if request.headers.get("origin") not in trusted_origins():
        raise HTTPException(403, "A trusted browser origin is required")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Cross-site reviewer requests are not allowed")


def require_reviewer(request: Request, session: SessionDep) -> Reviewer:
    token = request.cookies.get(COOKIE_NAME, "")
    if not TOKEN_PATTERN.fullmatch(token):
        raise HTTPException(401, "Reviewer authentication is required")
    match = session.execute(
        select(Reviewer, ReviewerSession)
        .join(ReviewerSession, ReviewerSession.reviewer_id == Reviewer.id)
        .where(
            ReviewerSession.token_hash == token_digest(token),
            ReviewerSession.expires_at > datetime.now(UTC),
            ReviewerSession.revoked_at.is_(None),
            Reviewer.active.is_(True),
            Reviewer.role.in_(("moderator", "admin")),
        )
    ).first()
    if match is None:
        raise HTTPException(401, "Reviewer authentication is required")
    reviewer, authenticated_session = match
    request.state.reviewer_session = authenticated_session
    return reviewer


def require_mutating_reviewer(request: Request, session: SessionDep) -> Reviewer:
    reviewer = require_reviewer(request, session)
    require_valid_origin(request)
    provided = request.headers.get("x-csrf-token", "")
    if not TOKEN_PATTERN.fullmatch(provided) or not secrets.compare_digest(
        provided, request.state.reviewer_session.csrf_token
    ):
        raise HTTPException(403, "A valid CSRF token is required")
    return reviewer


ReadReviewer = Annotated[Reviewer, Depends(require_reviewer)]
AuthenticatedReviewer = ReadReviewer
MutatingReviewer = Annotated[Reviewer, Depends(require_mutating_reviewer)]


def session_response(reviewer: Reviewer, authenticated_session: ReviewerSession) -> AuthSession:
    return AuthSession(
        reviewer=ReviewerIdentity(id=reviewer.id, username=reviewer.username, role=reviewer.role),
        csrf_token=authenticated_session.csrf_token,
        expires_at=authenticated_session.expires_at,
    )


def _throttles(session, username: str, client_address: str):
    now = datetime.now(UTC)
    session.execute(
        delete(AuthLoginThrottle).where(
            AuthLoginThrottle.window_started_at < now - timedelta(days=1)
        )
    )
    keys = {"user:" + hashlib.sha256(username.encode()).hexdigest(): 5}
    try:
        address = ipaddress.ip_address(client_address)
        if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
            address = address.ipv4_mapped
        loopback = address.is_loopback
    except ValueError:
        loopback = False
    # The native same-origin proxy shares a loopback backend peer across users.
    # A peer-wide lockout there would let anyone deny sign-in to every reviewer.
    # Keep account limits, do not trust X-Forwarded-For, and require deployment-
    # level distributed rate limiting before exposing a production proxy.
    if not loopback:
        keys["address:" + hashlib.sha256(client_address.encode()).hexdigest()] = 25
    attempts = []
    for key in sorted(keys):
        # Serialize the counter's first insert as well as later increments.
        session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": key})
        attempt = session.get(AuthLoginThrottle, key)
        if attempt is None:
            attempt = AuthLoginThrottle(key=key, failures=0, window_started_at=now)
            session.add(attempt)
        elif now - attempt.window_started_at >= _ATTEMPT_WINDOW:
            attempt.failures, attempt.window_started_at = 0, now
        if attempt.failures >= keys[key]:
            raise HTTPException(
                429, "Sign-in temporarily limited. Try again later.", headers={"Retry-After": "900"}
            )
        attempts.append(attempt)
    return attempts


@router.post("/login", response_model=AuthSession)
def login(body: LoginInput, request: Request, response: Response, session: SessionDep):
    require_valid_origin(request)
    attempts = _throttles(
        session, body.username, request.client.host if request.client else "unknown"
    )
    reviewer = session.scalar(select(Reviewer).where(Reviewer.username == body.username))
    try:
        valid, updated_hash = PASSWORD_HASH.verify_and_update(
            body.password, reviewer.password_hash if reviewer else _DUMMY_HASH
        )
    except (UnknownHashError, ValueError):
        valid, updated_hash = False, None
    if (
        not valid
        or reviewer is None
        or not reviewer.active
        or reviewer.role not in {"moderator", "admin"}
    ):
        for attempt in attempts:
            attempt.failures += 1
        session.commit()
        raise HTTPException(401, "Invalid credentials")

    now = datetime.now(UTC)
    # A successful authentication rotates rather than accepts a pre-existing token.
    previous = request.cookies.get(COOKIE_NAME, "")
    if TOKEN_PATTERN.fullmatch(previous):
        session.execute(
            update(ReviewerSession)
            .where(ReviewerSession.token_hash == token_digest(previous))
            .values(revoked_at=now)
        )
    token = secrets.token_urlsafe(32)
    authenticated_session = ReviewerSession(
        reviewer_id=reviewer.id,
        token_hash=token_digest(token),
        csrf_token=secrets.token_urlsafe(32),
        created_at=now,
        expires_at=now + SESSION_LIFETIME,
    )
    reviewer.last_login_at = now
    if updated_hash:
        reviewer.password_hash = updated_hash
    for attempt in attempts:
        if attempt.key.startswith("user:"):
            attempt.failures = 0
    session.add(authenticated_session)
    session.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        expires=authenticated_session.expires_at.astimezone(UTC),
        path=COOKIE_PATH,
        secure=production(),
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return session_response(reviewer, authenticated_session)


@router.get("/session", response_model=AuthSession)
def current_session(request: Request, reviewer: ReadReviewer):
    return session_response(reviewer, request.state.reviewer_session)


@router.post("/logout", status_code=204)
def logout(request: Request, reviewer: MutatingReviewer, response: Response, session: SessionDep):
    request.state.reviewer_session.revoked_at = datetime.now(UTC)
    session.commit()
    response.delete_cookie(
        COOKIE_NAME, path=COOKIE_PATH, secure=production(), httponly=True, samesite="lax"
    )
    response.status_code = 204
    response.headers["Cache-Control"] = "no-store"
    return response
