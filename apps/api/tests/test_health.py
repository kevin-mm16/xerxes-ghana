"""Smoke tests for the first API scaffold."""

from fastapi.testclient import TestClient

from xerxes_api.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "xerxes-api"}


def test_api_root() -> None:
    response = client.get("/api/v1")
    assert response.status_code == 200
    assert response.json()["version"] == "v1"
