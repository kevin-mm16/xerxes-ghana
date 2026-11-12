"""Real database checks for reviewer identity, revocation and browser protections."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from xerxes_api.auth import COOKIE_NAME, PASSWORD_HASH
from xerxes_api.auth_models import AuthLoginThrottle, Reviewer, ReviewerSession
from xerxes_api.auth_seed import seed_reviewer
from xerxes_api.main import app

ORIGIN = "http://localhost:3000"


@pytest.fixture
def auth_api(spatial, monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_PUBLIC_ORIGINS", ORIGIN)
    client, session = spatial
    password = secrets.token_urlsafe(24)
    reviewer = Reviewer(
        username="synthetic-" + uuid4().hex,
        password_hash=PASSWORD_HASH.hash(password),
        role="moderator",
        active=True,
    )
    session.add(reviewer)
    session.commit()
    return client, session, reviewer, password


def sign_in(auth_api, **overrides):
    client, _, reviewer, password = auth_api
    return client.post(
        "/api/v1/auth/login",
        headers={"Origin": ORIGIN},
        json={"username": reviewer.username, "password": password, **overrides},
    )


def stored_session(auth_api):
    _, session, reviewer, _ = auth_api
    return session.scalars(
        select(ReviewerSession)
        .where(ReviewerSession.reviewer_id == reviewer.id)
        .order_by(ReviewerSession.created_at.desc())
    ).first()


def test_public_caller_has_no_reviewer_session(auth_api):
    client, _, _, _ = auth_api
    response = client.get("/api/v1/auth/session")
    assert response.status_code == 401
    assert client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}).status_code == 401


def test_login_hashes_password_and_issues_only_opaque_cookie(auth_api):
    client, _, reviewer, password = auth_api
    response = sign_in(auth_api)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["authenticated"] is True
    assert data["reviewer"] == {
        "id": str(reviewer.id),
        "username": reviewer.username,
        "role": "moderator",
    }
    cookie_header = response.headers["set-cookie"].lower()
    assert "httponly" in cookie_header and "samesite=lax" in cookie_header
    assert "path=/api/v1" in cookie_header and "max-age=28800" in cookie_header
    assert "secure" not in cookie_header
    cookie = client.cookies.get(COOKIE_NAME)
    row = stored_session(auth_api)
    assert row.token_hash == hashlib.sha256(cookie.encode()).hexdigest()
    assert row.token_hash != cookie and data["csrfToken"] != cookie
    assert row.expires_at > datetime.now(UTC)
    assert reviewer.password_hash.startswith("$argon2id$")
    assert PASSWORD_HASH.verify(password, reviewer.password_hash)
    for private in (password, cookie, reviewer.password_hash, row.token_hash):
        assert private not in response.text
    current = client.get("/api/v1/auth/session")
    assert current.status_code == 200
    assert current.json()["csrfToken"] == data["csrfToken"]
    assert current.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("origin", [None, "null", "http://localhost:3000.attacker.invalid"])
def test_login_requires_exact_trusted_origin(auth_api, origin):
    client, _, reviewer, password = auth_api
    response = client.post(
        "/api/v1/auth/login",
        headers={"Origin": origin} if origin is not None else {},
        json={"username": reviewer.username, "password": password},
    )
    assert response.status_code == 403
    assert stored_session(auth_api) is None


def test_cross_site_fetch_metadata_is_rejected(auth_api):
    client, _, reviewer, password = auth_api
    response = client.post(
        "/api/v1/auth/login",
        headers={"Origin": ORIGIN, "Sec-Fetch-Site": "cross-site"},
        json={"username": reviewer.username, "password": password},
    )
    assert response.status_code == 403


def test_invalid_credentials_are_generic(auth_api):
    wrong_password = sign_in(auth_api, password=secrets.token_urlsafe(24))
    absent_user = sign_in(auth_api, username="absent-" + uuid4().hex)
    assert wrong_password.status_code == absent_user.status_code == 401
    assert wrong_password.json() == absent_user.json() == {"detail": "Invalid credentials"}
    assert stored_session(auth_api) is None


def test_failed_login_attempts_are_durable_and_expire(auth_api):
    _, session, _, _ = auth_api
    for _ in range(5):
        assert sign_in(auth_api, password="incorrect").status_code == 401
    blocked = sign_in(auth_api)
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "900"
    counters = session.scalars(select(AuthLoginThrottle)).all()
    assert len(counters) >= 2
    for counter in counters:
        counter.window_started_at = datetime.now(UTC) - timedelta(minutes=16)
    session.commit()
    assert sign_in(auth_api).status_code == 200


def test_loopback_proxy_failures_do_not_globally_lock_other_reviewers(auth_api):
    _, session, reviewer, password = auth_api
    with TestClient(app, client=("127.0.0.1", 50000)) as browser:
        for _ in range(30):
            response = browser.post(
                "/api/v1/auth/login",
                headers={"Origin": ORIGIN},
                json={"username": "absent-" + uuid4().hex, "password": "incorrect"},
            )
            assert response.status_code == 401
        response = browser.post(
            "/api/v1/auth/login",
            headers={"Origin": ORIGIN},
            json={"username": reviewer.username, "password": password},
        )
        assert response.status_code == 200
        for _ in range(5):
            response = browser.post(
                "/api/v1/auth/login",
                headers={"Origin": ORIGIN},
                json={"username": reviewer.username, "password": "incorrect"},
            )
            assert response.status_code == 401
        assert (
            browser.post(
                "/api/v1/auth/login",
                headers={"Origin": ORIGIN},
                json={"username": reviewer.username, "password": password},
            ).status_code
            == 429
        )
    loopback_key = "address:" + hashlib.sha256(b"127.0.0.1").hexdigest()
    assert session.get(AuthLoginThrottle, loopback_key) is None


def test_expired_session_is_denied_even_with_existing_cookie(auth_api):
    client, session, _, _ = auth_api
    assert sign_in(auth_api).status_code == 200
    row = stored_session(auth_api)
    row.created_at = datetime.now(UTC) - timedelta(hours=2)
    row.expires_at = datetime.now(UTC) - timedelta(hours=1)
    session.commit()
    assert client.get("/api/v1/auth/session").status_code == 401


def test_disabling_identity_invalidates_existing_session(auth_api):
    client, session, reviewer, _ = auth_api
    assert sign_in(auth_api).status_code == 200
    reviewer.active = False
    session.commit()
    assert client.get("/api/v1/auth/session").status_code == 401
    assert sign_in(auth_api).status_code == 401


def test_logout_requires_origin_and_session_csrf(auth_api):
    client, _, _, _ = auth_api
    login = sign_in(auth_api)
    csrf = login.json()["csrfToken"]
    assert client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}).status_code == 403
    assert client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 403
    assert (
        client.post(
            "/api/v1/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": "wrong"}
        ).status_code
        == 403
    )
    assert client.get("/api/v1/auth/session").status_code == 200
    cookie = client.cookies.get(COOKIE_NAME)
    response = client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN, "X-CSRF-Token": csrf})
    assert response.status_code == 204
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert stored_session(auth_api).revoked_at is not None
    # Revocation is server-side: replaying the old browser token still fails.
    client.cookies.clear()
    client.cookies.set(COOKIE_NAME, cookie, path="/api/v1")
    assert client.get("/api/v1/auth/session").status_code == 401


def test_successful_login_rotates_prior_browser_session(auth_api):
    client, _, _, _ = auth_api
    assert sign_in(auth_api).status_code == 200
    previous = client.cookies.get(COOKIE_NAME)
    row = stored_session(auth_api)
    assert sign_in(auth_api).status_code == 200
    assert client.cookies.get(COOKIE_NAME) != previous
    assert row.revoked_at is not None
    client.cookies.clear()
    client.cookies.set(COOKIE_NAME, previous, path="/api/v1")
    assert client.get("/api/v1/auth/session").status_code == 401


def test_password_spaces_are_not_silently_removed(auth_api):
    _, session, reviewer, password = auth_api
    padded = "  " + password + "  "
    reviewer.password_hash = PASSWORD_HASH.hash(padded)
    session.commit()
    assert sign_in(auth_api, password=padded).status_code == 200
    assert sign_in(auth_api, password=password).status_code == 401


def test_production_origin_fails_closed_and_cookie_is_secure(auth_api, monkeypatch):
    client, _, reviewer, password = auth_api
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("APP_PUBLIC_ORIGINS", raising=False)
    assert sign_in(auth_api).status_code == 503
    monkeypatch.setenv("APP_PUBLIC_ORIGINS", "http://reviewers.example")
    assert sign_in(auth_api).status_code == 503
    monkeypatch.setenv("APP_PUBLIC_ORIGINS", "https://reviewers.example")
    response = client.post(
        "/api/v1/auth/login",
        headers={"Origin": "https://reviewers.example"},
        json={"username": reviewer.username, "password": password},
    )
    assert response.status_code == 200
    assert "secure" in response.headers["set-cookie"].lower()
    assert "httponly" in response.headers["set-cookie"].lower()


def test_dev_seed_has_no_default_password_and_revokes_existing_sessions(auth_api, monkeypatch):
    client, session, reviewer, _ = auth_api
    login = sign_in(auth_api)
    assert login.status_code == 200
    replacement = secrets.token_urlsafe(24)
    with pytest.raises(RuntimeError, match="development"):
        seed_reviewer(session, reviewer.username, replacement)
    monkeypatch.setenv("APP_ENV", "development")
    with pytest.raises(ValueError, match="12"):
        seed_reviewer(session, reviewer.username, "short")
    seed_reviewer(session, reviewer.username, replacement, "admin")
    session.commit()
    assert client.get("/api/v1/auth/session").status_code == 401
    response = sign_in(auth_api, password=replacement)
    assert response.status_code == 200
    assert response.json()["reviewer"]["role"] == "admin"
